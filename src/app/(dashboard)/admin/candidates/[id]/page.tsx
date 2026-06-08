import { auth } from "@/lib/auth"
import { getCandidateById } from "@/lib/data-service"
import { redirect, notFound } from "next/navigation"
import CandidateDetailClient from "../../../../interviewer/[candidateId]/candidate-detail-client"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const candidate = await getCandidateById(id)
  return {
    title: candidate ? `${candidate.name} — Detail Admin` : "Siswa Tidak Ditemukan",
  }
}

export default async function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const { id } = await params
  const candidate = await getCandidateById(id)
  if (!candidate) notFound()

  const existingNote = candidate.notes[0] || null
  const savedSummary = candidate.aiSummary?.summary || null

  return (
    <div className="max-w-6xl mx-auto">
      <CandidateDetailClient
        candidate={candidate as any}
        existingNote={existingNote}
        savedSummary={savedSummary}
      />
    </div>
  )
}
