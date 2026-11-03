import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AdminNotesClient from "./admin-notes-client"
import type { InterviewerNote } from "@/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Catatan Observasi",
}

const RECOMMENDATIONS = ["Terima", "Pertimbangkan", "Tolak"] as const

export default async function AdminNotesPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const rows = await prisma.interviewerNote.findMany({
    include: { candidate: { select: { name: true, aiSummary: { select: { summary: true } } } } },
    orderBy: { createdAt: "desc" },
  })

  const notes: InterviewerNote[] = rows.map((n) => ({
    noteId: n.id,
    candidateId: n.candidateId,
    candidateName: n.candidate.name,
    interviewerEmail: n.interviewerEmail,
    interviewerName: n.interviewerName,
    observation: n.observation,
    academicAssessment: n.academicAssessment,
    familySupport: n.familySupport,
    characterNotes: n.characterNotes,
    recommendation: RECOMMENDATIONS.find((r) => r === n.recommendation) ?? "Pertimbangkan",
    submittedAt: n.createdAt.toISOString(),
    isLocked: n.isLocked,
    aiSummary: n.candidate.aiSummary?.summary ?? null,
  }))

  return <AdminNotesClient notes={notes} />
}
