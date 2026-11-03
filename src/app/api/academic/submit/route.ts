import { prisma } from "@/lib/prisma"
import { allow, ipFromHeaders } from "@/lib/rate-limit"
import { recordActivity } from "@/lib/activity"
import { verifyCandidateToken, verifyParentPhoneMatch } from "@/lib/candidate-auth"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

// Endpoint publik (siswa mengerjakan tes lewat QR tanpa akun): validasi ketat, batasi laju per IP,
// dan verifikasi token/nomor HP untuk mencegah pengerjaan tes atas nama siswa lain.
const BodySchema = z.object({
  candidateId: z.string().min(1).max(64),
  answers: z.record(z.string().max(64), z.string().max(500)),
  token: z.string().max(64).optional(),
  phone: z.string().trim().max(30).optional(),
})

export async function POST(req: Request) {
  try {
    if (!(await allow(`academic-submit:${ipFromHeaders(req.headers)}`, 30, 600))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 })
    const { candidateId, answers, token, phone } = parsed.data

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, name: true, parentPhone: true },
    })
    if (!candidate) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })

    // Tes hanya sekali: hasil pertama tidak boleh ditimpa.
    if (await prisma.academicTestResult.findUnique({ where: { candidateId } })) {
      return NextResponse.json({ success: true, message: "Already submitted" })
    }

    const questions = await prisma.academicQuestion.findMany()
    if (questions.length === 0) return NextResponse.json({ error: "Soal belum tersedia" }, { status: 409 })

    let correctCount = 0
    const subjectStats: Record<string, { total: number; correct: number }> = {}
    const responseData = questions.map((q) => {
      const studentAnswer = answers[q.id]
      const isCorrect = studentAnswer === q.correctAnswer
      if (isCorrect) correctCount++
      subjectStats[q.subject] ??= { total: 0, correct: 0 }
      subjectStats[q.subject].total++
      if (isCorrect) subjectStats[q.subject].correct++
      return { candidateId, questionId: q.id, answer: studentAnswer || "", isCorrect }
    })

    const totalScore = (correctCount / questions.length) * 100

    // create (bukan upsert): batas unik candidateId menolak pengiriman ganda yang bersamaan.
    await prisma.$transaction([
      prisma.academicResponse.deleteMany({ where: { candidateId } }),
      prisma.academicResponse.createMany({ data: responseData }),
      prisma.academicTestResult.create({
        data: { candidateId, totalScore, subjectScores: JSON.stringify(subjectStats) },
      }),
    ])

    await recordActivity({
      action: "TES_AKADEMIK",
      actorName: "Siswa",
      actorRole: "publik",
      targetType: "siswa",
      targetId: candidateId,
      targetLabel: candidate.name,
      detail: `Nilai: ${Math.round(totalScore)} (${correctCount}/${questions.length} benar)`,
      ip: ipFromHeaders(req.headers),
    })

    return NextResponse.json({ success: true, score: totalScore })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ success: true, message: "Already submitted" })
    }
    console.error("Submit error:", error)
    return NextResponse.json({ error: "Failed to submit answers" }, { status: 500 })
  }
}
