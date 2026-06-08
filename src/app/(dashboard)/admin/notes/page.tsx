import { auth } from "@/lib/auth"
import { getAllNotes, getCandidates } from "@/lib/google-sheets"
import { redirect } from "next/navigation"
import AdminNotesClient from "./admin-notes-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Catatan Observasi",
}

export default async function AdminNotesPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const [notes, candidates] = await Promise.all([
    getAllNotes(),
    getCandidates(),
  ])

  // Map candidate ID to name for display
  const enrichedNotes = notes.map((note) => ({
    ...note,
    candidateName:
      candidates.find((c) => c.id === note.candidateId)?.name || note.candidateId,
  }))

  return <AdminNotesClient notes={enrichedNotes} />
}
