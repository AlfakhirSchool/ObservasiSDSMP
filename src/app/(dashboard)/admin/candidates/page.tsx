import { canViewMonitoring, isAdminRole } from "@/lib/permissions"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AdminCandidatesClient from "./admin-candidates-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Seluruh Siswa - Al Fakhir",
}

export default async function AdminCandidatesPage() {
  const session = await auth()
  if (!session || !canViewMonitoring(session.user?.role)) redirect("/login")

  const candidates = await (prisma as any).candidate.findMany({
    include: {
      notes: {
        take: 1,
        orderBy: { createdAt: "desc" }
      },
      academicTestResult: true
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  const enriched = (candidates as any[]).map((c) => ({
    ...c,
    note: c.notes[0] || null,
    hasNote: c.notes.some((n: { isLocked: boolean }) => n.isLocked),
    createdAt: c.createdAt,
    daysSinceForm: c.createdAt
      ? Math.floor(
          (Date.now() - new Date(c.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null,
  }))

  return <AdminCandidatesClient candidates={enriched} readOnly={!isAdminRole(session.user.role)} />
}
