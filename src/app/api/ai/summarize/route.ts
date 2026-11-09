import { auth } from "@/lib/auth"
import { generateCandidateSummary } from "@/lib/gemini"
import { prisma } from "@/lib/prisma"
import { allow } from "@/lib/rate-limit"
import { logActivity } from "@/lib/activity-log"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  if (role !== "interviewer" && !role.startsWith("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body: unknown = await request.json()
    const candidateId =
      body && typeof body === "object" && "candidateId" in body && typeof body.candidateId === "string" ? body.candidateId : null
    if (!candidateId) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })

    // Setiap panggilan memakai kuota Gemini berbayar: maksimal 8 per menit per pengguna.
    if (!(await allow(`ai:${session.user.id}`, 8, 60))) {
      return NextResponse.json({ error: "Terlalu sering. Coba lagi sebentar lagi." }, { status: 429 })
    }

    // Data diambil dari database, bukan dari klien, supaya isi ringkasan tidak bisa dipalsukan.
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        name: true,
        level: true,
        selectedInterviewer: true,
        formAnswers: { select: { value: true, question: { select: { text: true } } } },
      },
    })
    if (!candidate) return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 })

    if (role === "interviewer" && candidate.level !== "SD" && candidate.selectedInterviewer !== session.user.name) {
      return NextResponse.json({ error: "Siswa ini bukan tanggung jawab Anda" }, { status: 403 })
    }
    if (candidate.formAnswers.length === 0) {
      return NextResponse.json({ error: "Tidak ada data formulir untuk diringkas" }, { status: 400 })
    }

    const formResponse = Object.fromEntries(candidate.formAnswers.map((a) => [a.question.text, a.value]))
    const summaryText = await generateCandidateSummary(
      formResponse,
      candidate.name,
      candidate.level,
      candidate.level === "SD" ? "Orang Tua" : "Siswa"
    )

    await prisma.aiSummary.upsert({
      where: { candidateId },
      update: { summary: summaryText },
      create: { candidateId, summary: summaryText },
    })

    await logActivity({
      action: "RINGKASAN_AI",
      targetType: "siswa",
      targetId: candidateId,
      targetLabel: candidate.name,
      detail: `Jenjang ${candidate.level}`,
    })

    return NextResponse.json({ summary: summaryText })
  } catch (error) {
    console.error("[POST /api/ai/summarize]", error)
    return NextResponse.json({ error: "Gagal menghasilkan ringkasan AI" }, { status: 500 })
  }
}
