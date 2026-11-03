import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Endpoint publik untuk siswa. JANGAN pernah menyertakan correctAnswer di sini.
export async function GET() {
  try {
    const questions = await prisma.academicQuestion.findMany({
      orderBy: { order: "asc" },
      select: { id: true, text: true, subject: true, imageUrl: true, options: true, order: true },
    })

    const formatted = questions.map((q) => ({ ...q, options: JSON.parse(q.options) as string[] }))

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}
