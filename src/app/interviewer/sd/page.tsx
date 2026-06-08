import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import InterviewerDashboardClient from "../interviewer-client"

export default async function InterviewerSdPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const candidates = await prisma.candidate.findMany({
    where: { level: "SD" },
    include: {
      notes: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const enriched = candidates.map((c) => ({
    ...c,
    hasResponse: c.status !== "PENDING",
    hasNote: c.notes.length > 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">UNIT SD</div>
      </div>
      <InterviewerDashboardClient initialCandidates={enriched as any} />
    </div>
  )
}
