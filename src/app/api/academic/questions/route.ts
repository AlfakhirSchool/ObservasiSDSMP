import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const questions = await (prisma as any).academicQuestion.findMany({
      orderBy: { order: 'asc' }
    })
    
    // Parse options back to arrays
    const formatted = questions.map((q: any) => ({
      ...q,
      options: JSON.parse(q.options)
    }))
    
    return NextResponse.json(formatted)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}
