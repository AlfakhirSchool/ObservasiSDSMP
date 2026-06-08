import { auth } from "@/lib/auth"
import { generateCandidateSummary } from "@/lib/gemini"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { candidateId, formResponse, candidateName, level } = await request.json()

    if (!candidateId || !formResponse || !candidateName || !level) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
    }

    const summaryText = await generateCandidateSummary(
      formResponse,
      candidateName,
      level,
      level === "SD" ? "Orang Tua" : "Siswa"
    )

    // Save to Prisma
    await prisma.aiSummary.upsert({
      where: { candidateId },
      update: { summary: summaryText },
      create: {
        candidateId,
        summary: summaryText,
      }
    })

    return NextResponse.json({ summary: summaryText })
  } catch (error: any) {
    console.error("[POST /api/ai/summarize]", error)
    return NextResponse.json(
      { error: error.message || "Gagal menghasilkan ringkasan AI" },
      { status: 500 }
    )
  }
}
