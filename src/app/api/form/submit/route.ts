import { prisma } from "@/lib/prisma"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { generateCandidateSummary } from "@/lib/gemini"
import { allow, ipFromHeaders } from "@/lib/rate-limit"
import { answerError } from "@/lib/form-validation"
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

// Orang tua kadang menulis "Benar"/"Sudah benar" di kolom koreksi nama; itu bukan nama dan tidak boleh menimpa nama siswa.
const BUKAN_NAMA = /^(?:(?:sudah|udah)\s+)?(?:benar|betul|sesuai|ok|oke)$|^(?:-+|tidak ada)$/i

/** Koreksi nama yang layak disimpan, atau undefined bila kosong, hanya beda huruf/spasi, atau bukan nama. */
function koreksiNama(koreksi: string | undefined, namaTerdaftar: string) {
  const bersih = koreksi?.trim().replace(/\s+/g, " ")
  if (!bersih || BUKAN_NAMA.test(bersih)) return undefined
  return bersih.toLowerCase() === namaTerdaftar.trim().replace(/\s+/g, " ").toLowerCase() ? undefined : bersih
}

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
      select: { id: true, name: true, status: true, parentPhone: true, notes: { select: { isLocked: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })

    // 1. Dapatkan semua pertanyaan yang valid untuk kategori peran ini
    const categoryToProcess = role === "student" ? "SISWA" : "ORANG TUA"
    const validQuestions = await prisma.formQuestion.findMany({
      where: { category: categoryToProcess },
      select: { id: true, text: true },
    })
    const validQuestionIds = validQuestions.map((q) => q.id)
    const validQuestionSet = new Set(validQuestionIds)

    // Observasi yang sudah dikunci: jawaban yang sudah ada tidak boleh diubah, tetapi siswa yang belum pernah
    // mengisi kategori ini boleh mengisi pertama kali (melengkapi data, tidak menimpa apa pun).
    if (existing.notes.some((n) => n.isLocked)) {
      const already = await prisma.formAnswer.count({ where: { candidateId, questionId: { in: validQuestionIds } } })
      if (already > 0) {
        return NextResponse.json({ error: "Observasi sudah selesai, jawaban tidak dapat diubah" }, { status: 409 })
      }
    }

    // Hanya jawaban yang sesuai kategori perannya yang diproses
    const filteredAnswers = Object.entries(answers)
      .filter(([questionId]) => validQuestionSet.has(questionId))
      .map(([questionId, value]) => ({ candidateId, questionId, value }))

    // Tanpa satu pun jawaban yang cocok (mis. soal sudah diganti admin) jangan tandai "formulir masuk":
    // siswa harus tetap terlihat belum mengisi, dan orang tua diminta memuat ulang.
    if (filteredAnswers.length === 0) {
      return NextResponse.json(
        { error: "Jawaban tidak cocok dengan pertanyaan terbaru. Muat ulang halaman formulir lalu isi kembali." },
        { status: 409 }
      )
    }

    const teksSoal = new Map(validQuestions.map((q) => [q.id, q.text]))
    for (const a of filteredAnswers) {
      const error = answerError(teksSoal.get(a.questionId) ?? "", a.value)
      if (error) return NextResponse.json({ error }, { status: 400 })
    }

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
          // Status akhir yang diset admin (REVIEWED/COMPLETED) tidak diturunkan oleh pengisian formulir.
          ...(existing.status === "REVIEWED" || existing.status === "COMPLETED" ? {} : { status: "RESPONSE_RECEIVED" as const }),
          ...(role === "student"
            ? { studentEmail: email }
            : { parentEmail: email, parentPhone, correctedName: koreksiNama(correctedName, existing.name) }),
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
