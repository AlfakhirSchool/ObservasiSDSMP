import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    const { candidateId, selectedInterviewer, answers, role, parentPhone, correctedName } = await req.json()
    const email = session?.user?.email || null

    if (!candidateId || !answers) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
    }

    // 1. Dapatkan semua pertanyaan yang valid untuk kategori peran ini
    const categoryToProcess = role === "student" ? "SISWA" : "ORANG TUA"
    const validQuestions = await prisma.formQuestion.findMany({
      where: { category: categoryToProcess },
      select: { id: true }
    })
    const validQuestionIds = new Set(validQuestions.map(q => q.id))

    // Filter jawaban agar hanya memproses yang sesuai dengan kategori perannya
    const filteredAnswers = Object.entries(answers)
      .filter(([questionId]) => validQuestionIds.has(questionId))
      .map(([questionId, value]) => ({
        candidateId,
        questionId,
        value: value as string,
      }))

    if (filteredAnswers.length === 0) {
      // Jika tidak ada jawaban valid untuk kategori ini, mungkin hanya update status/metadata
      // Tapi biasanya minimal ada satu jawaban
    }

    await prisma.$transaction(async (tx) => {
      // Hapus hanya jawaban untuk pertanyaan yang masuk dalam kategori peran ini
      await (tx as any).formAnswer.deleteMany({
        where: { 
          candidateId,
          questionId: {
            in: Array.from(validQuestionIds)
          }
        },
      })

      // Simpan jawaban baru (hanya yang sudah difilter)
      if (filteredAnswers.length > 0) {
        await (tx as any).formAnswer.createMany({
          data: filteredAnswers,
        })
      }

      // 2. Update status kandidat dan simpan siapa pewawancaranya serta email pengirim
      await (tx as any).candidate.update({
        where: { id: candidateId },
        data: {
          status: "RESPONSE_RECEIVED",
          selectedInterviewer: selectedInterviewer,
          ...(role === "student" 
            ? { studentEmail: email } 
            : { 
                parentEmail: email,
                // @ts-ignore
                parentPhone: parentPhone,
                // @ts-ignore
                correctedName: correctedName
              }
          )
        },
      })
    })
    
    // 3. Trigger AI Summary (Gemini) in background or after transaction
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: { formAnswers: { include: { question: true } } }
      })
      
      if (candidate) {
        const { generateCandidateSummary } = await import("@/lib/gemini")
        
        const formResponse: Record<string, string> = {}
        candidate.formAnswers.forEach((ans: any) => {
          formResponse[ans.question.text] = ans.value
        })
        
        const summary = await generateCandidateSummary(
          formResponse,
          candidate.name,
          candidate.level as any,
          candidate.level === "SD" ? "Orang Tua" : "Siswa"
        )
        
        await prisma.aiSummary.upsert({
          where: { candidateId },
          update: { summary },
          create: { candidateId, summary }
        })
      }
    } catch (aiError) {
      console.error("AI Summarization failed but form was saved:", aiError)
      // We don't fail the whole request if AI fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Form submission error:", error)
    return NextResponse.json({ error: "Gagal menyimpan jawaban" }, { status: 500 })
  }
}
