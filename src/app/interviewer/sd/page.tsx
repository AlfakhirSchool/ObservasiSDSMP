import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import InterviewerDashboardClient from "../interviewer-client"

export default async function InterviewerSDPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const candidates = await prisma.candidate.findMany({
    where: { level: "SD" },
    include: {
      notes: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const rows = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    selectedInterviewer: c.selectedInterviewer,
    createdAt: c.createdAt.toISOString(),
    academicYear: c.academicYear,
    gelombang: c.gelombang,
    hasResponse: c.status !== "PENDING",
    // Catatan yang kuncinya dibuka admin dianggap belum selesai: siswa muncul lagi sebagai "Perlu observasi".
    hasNote: c.notes.some((n) => n.isLocked),
  }))

  // Untuk Unit SD, semua siswa SD tampil di semua observer SD (tidak dikunci per guru)
  return (
    <InterviewerDashboardClient
      unit="SD"
      initialCandidates={rows}
      lockedInterviewer={undefined}
    />
  )
}
