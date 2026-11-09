import { prisma } from "@/lib/prisma"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { generateCandidateSummary } from "@/lib/gemini"
import { allow, ipFromHeaders } from "@/lib/rate-limit"
import { recordActivity } from "@/lib/activity"

// Pekerjaan setelah respons (ringkasan AI) berjalan sampai batas ini di Vercel.
export const maxDuration = 60

// Endpoint publik (orang tua/siswa mengisi lewat QR tanpa akun): validasi ketat dan batasi laju per IP dan per siswa.
const BodySchema = z.object({
  candidateId: z.string().min(1).max(64),
  answers: z.record(z.string().max(64), z.string().max(5000)),
  role: z.string().max(20).optional(),
  parentPhone: z.string().trim().max(30).optional(),
  correctedName: z.string().trim().max(120).optional(),
  token: z.string().max(64).optional(),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    const email = session?.user?.email || null

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: "Data tidak lengkap atau tidak valid" }, { status: 400 })
    const { candidateId, answers, role, parentPhone, correctedName, token } = parsed.data

    const [ipOk, candidateOk] = await Promise.all([
      allow(`form-ip:${ipFromHeaders(req.headers)}`, 20, 600),
      allow(`form-candidate:${candidateId}`, 10, 3600),
    ])
    if (!ipOk || !candidateOk) {
      return NextResponse.json({ error: "Terlalu banyak pengiriman. Coba lagi nanti." }, { status: 429 })
    }

    const existing = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, name: true, parentPhone: true, notes: { select: { isLocked: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })

    // Setelah observasi dikunci, jawaban formulir tidak boleh diubah lagi.
    if (existing.notes.some((n) => n.isLocked)) {
      return NextResponse.json({ error: "Observasi sudah selesai, jawaban tidak dapat diubah" }, { status: 409 })
    }

    // 1. Dapatkan semua pertanyaan yang valid untuk kategori peran ini
    const categoryToProcess = role === "student" ? "SISWA" : "ORANG TUA"
    const validQuestions = await prisma.formQuestion.findMany({
      where: { category: categoryToProcess },
      select: { id: true },
    })
    const validQuestionIds = validQuestions.map((q) => q.id)
    const validQuestionSet = new Set(validQuestionIds)

    // Hanya jawaban yang sesuai kategori perannya yang diproses
    const filteredAnswers = Object.entries(answers)
      .filter(([questionId]) => validQuestionSet.has(questionId))
      .map(([questionId, value]) => ({ candidateId, questionId, value }))

    await prisma.$transaction(async (tx) => {
      // Hapus hanya jawaban untuk pertanyaan yang masuk dalam kategori peran ini
      await tx.formAnswer.deleteMany({ where: { candidateId, questionId: { in: validQuestionIds } } })

      if (filteredAnswers.length > 0) {
        await tx.formAnswer.createMany({ data: filteredAnswers })
      }

      // 2. Update status kandidat. Pewawancara (selectedInterviewer) TIDAK diambil dari klien.
      await tx.candidate.update({
        where: { id: candidateId },
        data: {
          status: "RESPONSE_RECEIVED",
          ...(role === "student"
            ? { studentEmail: email }
            : { parentEmail: email, parentPhone, correctedName }),
        },
      })
    })

    await recordActivity({
      action: "FORM_ISI",
      actorName: role === "student" ? "Siswa" : "Orang Tua",
      actorRole: "publik",
      targetType: "siswa",
      targetId: candidateId,
      targetLabel: existing.name,
      detail: `${filteredAnswers.length} jawaban (${categoryToProcess})`,
      ip: ipFromHeaders(req.headers),
    })

    // 3. Ringkasan AI (Gemini) dibuat SETELAH jawaban dibalas: orang tua tidak perlu menunggu AI (bisa puluhan detik
    //    untuk ratusan jawaban). Kegagalan AI tidak memengaruhi jawaban yang sudah tersimpan.
    after(async () => {
      try {
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { name: true, level: true, formAnswers: { select: { value: true, question: { select: { text: true } } } } },
        })
        if (!candidate) return

        const formResponse = Object.fromEntries(candidate.formAnswers.map((a) => [a.question.text, a.value]))
        const summary = await generateCandidateSummary(
          formResponse,
          candidate.name,
          candidate.level,
          candidate.level === "SD" ? "Orang Tua" : "Siswa"
        )

        await prisma.aiSummary.upsert({
          where: { candidateId },
          update: { summary },
          create: { candidateId, summary },
        })
      } catch (aiError) {
        console.error("AI Summarization failed but form was saved:", aiError)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Form submission error:", error)
    return NextResponse.json({ error: "Gagal menyimpan jawaban" }, { status: 500 })
  }
}
