import { auth } from "@/lib/auth"
import { getCandidateById } from "@/lib/data-service"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import CandidateDetailClient from "./candidate-detail-client"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ candidateId: string }>
}): Promise<Metadata> {
  const { candidateId } = await params
  const candidate = await getCandidateById(candidateId)
  return {
    title: candidate ? `${candidate.name} — Detail Siswa` : "Siswa Tidak Ditemukan",
  }
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { candidateId } = await params
  const candidate = await getCandidateById(candidateId)
  if (!candidate) notFound()

  // Interviewer can only see their own candidates
  if (
    session.user.role === "interviewer" &&
    candidate.selectedInterviewer !== session.user.name
  ) {
    redirect("/interviewer")
  }

  const existingNote = candidate.notes[0] || null
  const savedSummary = candidate.aiSummary?.summary || null

  return (
    <CandidateDetailClient
      candidate={candidate as any}
      existingNote={existingNote}
      savedSummary={savedSummary}
    />
  )
}
