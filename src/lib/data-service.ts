import { prisma } from "./prisma"
import { Level } from "@prisma/client"

/** Gelombang aktif untuk tahun ajaran: nomor tertinggi yang sudah dipakai, atau 1 jika belum ada siswa. */
export async function getCurrentGelombang(academicYear: string) {
  const latest = await prisma.candidate.aggregate({ where: { academicYear }, _max: { gelombang: true } })
  return latest._max.gelombang ?? 1
}

export async function getDashboardStats(level?: string, academicYear?: string) {
  const where: any = {}
  if (level) where.level = level as any
  if (academicYear && academicYear !== "all") where.academicYear = academicYear
  
  const total = await prisma.candidate.count({ where })
  const pending = await prisma.candidate.count({ where: { ...where, status: "PENDING" } })
  const received = await prisma.candidate.count({ where: { ...where, status: "RESPONSE_RECEIVED" } })
  const reviewed = await prisma.candidate.count({ where: { ...where, status: "REVIEWED" } })
  
  const notesWhere: any = {}
  if (level) notesWhere.candidate = { level: level as any }
  if (academicYear && academicYear !== "all") {
    notesWhere.candidate = {
      ...(notesWhere.candidate || {}),
      academicYear: academicYear
    }
  }

  const completed = await prisma.interviewerNote.count({ 
    where: { 
      ...notesWhere,
      recommendation: "Terima" 
    } 
  })
  
  const notesTotal = await prisma.interviewerNote.count({
    where: notesWhere
  })

  const recentObservations = await prisma.interviewerNote.findMany({
    where: notesWhere,
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          level: true,
          room: true,
          status: true,
          parentEmail: true,
          studentEmail: true,
          academicYear: true,
        }
      }
    }
  })

  // Calculate Chart Data (Last 7 Days)
  const chartData = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const nextD = new Date(d)
    nextD.setDate(nextD.getDate() + 1)

    const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    
    const countNew = await prisma.candidate.count({
      where: {
        ...where,
        createdAt: { gte: d, lt: nextD }
      }
    })

    const countDone = await prisma.interviewerNote.count({
      where: {
        ...notesWhere,
        createdAt: { gte: d, lt: nextD }
      }
    })

    chartData.push({ name: dateStr, baru: countNew, selesai: countDone })
  }

  const progressPercentage = total > 0 ? Math.round((notesTotal / total) * 100) : 0
  
  const statusItems = [
    { label: "Sistem Aktif & Terpantau", color: "bg-[#26A69A]" },
    { label: "Data Formulir Sinkron", color: "bg-[#42A5F5]" },
    { label: `${pending + received} Observasi Tertunda`, color: "bg-[#EF5350]" },
  ]

  return {
    total,
    pending,
    received,
    reviewed,
    completed,
    notesTotal,
    recentObservations,
    chartData,
    monthlyTarget: total,
    progressPercentage,
    statusItems
  }
}

export async function getInterviewerStats() {
  const interviewers = await prisma.interviewerNote.groupBy({
    by: ["interviewerName", "interviewerEmail"],
    _count: {
      id: true,
    },
  })

  return interviewers.map((i: { interviewerName: string; interviewerEmail: string; _count: { id: number } }) => ({
    name: i.interviewerName,
    email: i.interviewerEmail,
    completed: i._count.id,
  }))
}

export async function getCandidatesByLevel(level?: Level) {
  return await prisma.candidate.findMany({
    where: level ? { level } : {},
    include: {
      notes: true,
      aiSummary: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function getCandidatesByInterviewer(name: string) {
  return await prisma.candidate.findMany({
    where: {
      selectedInterviewer: name,
    },
    include: {
      notes: true,
      aiSummary: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function getCandidateById(id: string) {
  return await prisma.candidate.findUnique({
    where: { id },
    include: {
      notes: true,
      aiSummary: true,
      academicTestResult: true,
      academicResponses: {
        include: {
          question: true
        }
      },
      formAnswers: {
        include: {
          question: true
        }
      }
    }
  })
}

export async function getAllRooms(level?: string) {
  const rooms = await prisma.candidate.groupBy({
    by: ["room"],
    where: {
      room: { not: null },
      ...(level ? { level: level as any } : {})
    }
  })
  return rooms.map((r: any) => r.room).filter(Boolean) as string[]
}

export async function getCandidatesByRoom(room: string) {
  return await prisma.candidate.findMany({
    where: { room },
    select: {
      id: true,
      name: true,
      level: true,
      selectedInterviewer: true,
    }
  })
}
export async function getCandidates(interviewerEmail?: string, level?: string) {
  const where: any = {}
  if (level) where.level = level as any
  
  // Note: if we want to filter by interviewerEmail, we'd need a relation or a specific field.
  // For now, let's just return all candidates if no email is provided, 
  // or handle interviewer filtering if the email is linked to the name.
  
  return await prisma.candidate.findMany({
    where,
    include: {
      notes: {
        take: 1,
        orderBy: { createdAt: "desc" }
      },
      academicTestResult: true,
    },
    orderBy: {
      createdAt: "desc"
    }
  })
}

export interface InterviewerMonitorRow {
  username: string
  name: string
  assigned: number
  withForm: number
  notesDone: number
  progress: number
}

export async function getInterviewerMonitor(): Promise<InterviewerMonitorRow[]> {
  const users = await prisma.user.findMany({
    where: { role: "INTERVIEWER", username: { not: null } },
    select: { username: true, name: true },
    orderBy: { name: "asc" },
  })

  const names = users.flatMap((u) => (u.name ? [u.name] : []))
  const candidates = names.length
    ? await prisma.candidate.findMany({
        where: { selectedInterviewer: { in: names } },
        select: {
          selectedInterviewer: true,
          status: true,
          _count: { select: { notes: true } },
        },
      })
    : []

  const totals = new Map<string, { assigned: number; withForm: number; notesDone: number }>()
  for (const c of candidates) {
    if (!c.selectedInterviewer) continue
    const entry = totals.get(c.selectedInterviewer) ?? { assigned: 0, withForm: 0, notesDone: 0 }
    entry.assigned += 1
    if (c.status !== "PENDING") entry.withForm += 1
    if (c._count.notes > 0) entry.notesDone += 1
    totals.set(c.selectedInterviewer, entry)
  }

  return users.flatMap((u) => {
    if (!u.username) return []
    const name = u.name ?? u.username
    const t = (u.name ? totals.get(u.name) : undefined) ?? { assigned: 0, withForm: 0, notesDone: 0 }
    return [
      {
        username: u.username,
        name,
        assigned: t.assigned,
        withForm: t.withForm,
        notesDone: t.notesDone,
        progress: t.assigned > 0 ? Math.round((t.notesDone / t.assigned) * 100) : 0,
      },
    ]
  })
}
