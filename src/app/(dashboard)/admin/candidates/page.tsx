import { canViewMonitoring, isAdminRole } from "@/lib/permissions"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AdminCandidatesClient from "./admin-candidates-client"
import FormYearToggles from "./form-year-toggles"
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

  const isAdmin = isAdminRole(session.user.role)
  const closed = new Set(
    (await prisma.formYear.findMany({ where: { open: false }, select: { academicYear: true } })).map((y) => y.academicYear),
  )
  const studentsByYear = new Map<string, number>()
  for (const c of enriched) if (c.academicYear) studentsByYear.set(c.academicYear, (studentsByYear.get(c.academicYear) ?? 0) + 1)
  const years = [...studentsByYear]
    .map(([year, students]) => ({ year, students, open: !closed.has(year) }))
    .sort((a, b) => b.year.localeCompare(a.year))

  return (
    <div className="space-y-6">
      {isAdmin && <FormYearToggles years={years} />}
      <AdminCandidatesClient candidates={enriched} readOnly={!isAdmin} />
    </div>
  )
}
