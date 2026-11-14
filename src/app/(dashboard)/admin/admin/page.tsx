import { auth } from "@/lib/auth"
import { getDashboardStats, type PeriodSummaryItem } from "@/lib/data-service"
import { prisma } from "@/lib/prisma"
import { Level } from "@prisma/client"
import { redirect } from "next/navigation"
import AdminOverviewClient from "../admin-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ringkasan Admin - Al Fakhir",
}

export default async function AdminPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const role = session.user.role as string
  const levelFilter: Level | undefined =
    role === "admin_sd" ? Level.SD : role === "admin_smp" ? Level.SMP : undefined

  // Ambil daftar tahun ajaran & gelombang yang tersedia dari DB (terbaru dulu)
  const periodGroups = await prisma.candidate.groupBy({
    by: ["academicYear", "gelombang"],
    where: {
      ...(levelFilter ? { level: levelFilter } : {}),
      academicYear: { not: null },
    },
    _count: { id: true },
    orderBy: [{ academicYear: "desc" }, { gelombang: "asc" }],
  })

  const availablePeriods: PeriodSummaryItem[] = periodGroups.map((g) => ({
    academicYear: g.academicYear ?? "-",
    gelombang: g.gelombang,
    count: g._count.id,
  }))

  const uniqueYears = Array.from(new Set(availablePeriods.map((p) => p.academicYear)))
  const defaultYear = uniqueYears[0] || "2027/2028"
  const defaultWave = "all"

  const stats = await getDashboardStats(levelFilter, defaultYear, defaultWave)

  return (
    <AdminOverviewClient
      stats={stats}
      role={session.user.role}
      availablePeriods={availablePeriods}
      initialYear={defaultYear}
      initialWave={defaultWave}
    />
  )
}
