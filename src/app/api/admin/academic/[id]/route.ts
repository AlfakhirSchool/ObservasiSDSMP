import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  
  if (!session || !session.user?.role?.startsWith("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { text, subject, options, correctAnswer, imageUrl, order } = body

    const question = await (prisma as any).academicQuestion.update({
      where: { id },
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
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!session || !session.user?.role?.startsWith("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await (prisma as any).academicQuestion.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
