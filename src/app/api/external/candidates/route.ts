import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function checkApiKey(req: Request) {
  const key = req.headers.get("x-api-key")
  return key === process.env.EXTERNAL_API_KEY
}

export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || "COMPLETED"
  const level = searchParams.get("level") || undefined

  const candidates = await prisma.candidate.findMany({
    where: {
      status: status as any,
      ...(level ? { level: level as any } : {}),
    },
    include: {
      notes: { select: { recommendation: true, interviewerName: true } },
      academicTestResult: { select: { totalScore: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const stats = await Promise.all([
    prisma.candidate.count({ where: level ? { level: level as any } : {} }),
    prisma.candidate.count({ where: { status: "COMPLETED", ...(level ? { level: level as any } : {}) } }),
    prisma.candidate.count({ where: { status: "PENDING", ...(level ? { level: level as any } : {}) } }),
    prisma.interviewerNote.count({
      where: {
        recommendation: "Terima",
        ...(level ? { candidate: { level: level as any } } : {}),
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    stats: {
      total: stats[0],
      completed: stats[1],
      pending: stats[2],
      diterima: stats[3],
    },
    candidates: candidates.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      status: c.status,
      room: c.room,
      parentEmail: c.parentEmail,
      parentPhone: c.parentPhone,
      studentEmail: c.studentEmail,
      correctedName: c.correctedName,
      academicScore: c.academicTestResult?.totalScore ?? null,
      recommendation: c.notes[0]?.recommendation ?? null,
      interviewer: c.notes[0]?.interviewerName ?? null,
      createdAt: c.createdAt,
    })),
  })
}
