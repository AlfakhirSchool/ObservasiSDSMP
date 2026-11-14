import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import InterviewerDashboardClient from "../interviewer-client"

export default async function InterviewerSMPPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const candidates = await prisma.candidate.findMany({
    where: { level: "SMP" },
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

  const lockedInterviewer =
    session.user.role === "interviewer" ? session.user.name ?? undefined : undefined

  return (
    <InterviewerDashboardClient
      unit="SMP"
      initialCandidates={rows}
      lockedInterviewer={lockedInterviewer}
    />
  )
}
