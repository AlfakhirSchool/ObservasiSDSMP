import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const questions = await (prisma as any).academicQuestion.findMany({
    orderBy: { order: 'asc' }
  })
  
  return NextResponse.json(questions.map((q: any) => ({
    ...q,
    options: JSON.parse(q.options)
  })))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { text, subject, options, correctAnswer, imageUrl, order } = body

    const question = await (prisma as any).academicQuestion.create({
      data: {
        text,
        subject,
        options: JSON.stringify(options),
        correctAnswer,
        imageUrl,
        order: parseInt(order) || 0
      }
    })

    return NextResponse.json(question)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}
