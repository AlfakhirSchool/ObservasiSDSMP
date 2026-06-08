import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { candidateId, answers } = await req.json()
    
    // Check if already submitted to prevent retakes
    const existingResult = await (prisma as any).academicTestResult.findUnique({
      where: { candidateId }
    })
    
    if (existingResult) {
      return NextResponse.json({ success: true, message: "Already submitted" })
    }
    
    const questions = await (prisma as any).academicQuestion.findMany()
    let correctCount = 0
    const subjectStats: Record<string, { total: number; correct: number }> = {}
    
    const responseData = []
    
    for (const q of (questions as any[])) {
      const studentAnswer = answers[q.id]
      const isCorrect = studentAnswer === q.correctAnswer
      
      if (isCorrect) correctCount++
      
      // Track subject-wise stats
      if (!subjectStats[q.subject]) {
        subjectStats[q.subject] = { total: 0, correct: 0 }
      }
      subjectStats[q.subject].total++
      if (isCorrect) subjectStats[q.subject].correct++
      
      responseData.push({
        candidateId,
        questionId: q.id,
        answer: studentAnswer || "",
        isCorrect
      })
    }
    
    const totalScore = (correctCount / questions.length) * 100
    
    // Save responses in transaction
    await (prisma as any).$transaction([
      (prisma as any).academicResponse.deleteMany({ where: { candidateId } }),
      (prisma as any).academicResponse.createMany({ data: responseData }),
      (prisma as any).academicTestResult.upsert({
        where: { candidateId },
        update: {
          totalScore,
          subjectScores: JSON.stringify(subjectStats)
        },
        create: {
          candidateId,
          totalScore,
          subjectScores: JSON.stringify(subjectStats)
        }
      })
    ])
    
    return NextResponse.json({ success: true, score: totalScore })
  } catch (error) {
    console.error("Submit error:", error)
    return NextResponse.json({ error: "Failed to submit answers" }, { status: 500 })
  }
}
