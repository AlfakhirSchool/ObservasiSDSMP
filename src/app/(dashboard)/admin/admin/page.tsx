import { auth } from "@/lib/auth"
import { getDashboardStats } from "@/lib/data-service"
import { prisma } from "@/lib/prisma"
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
  let levelFilter: string | undefined = undefined
  
  if (role === "admin_sd") levelFilter = "SD"
  if (role === "admin_smp") levelFilter = "SMP"

  // Ambil daftar tahun ajaran yang tersedia dari DB (terbaru dulu)
  const yearGroups = await (prisma as any).candidate.groupBy({
    by: ["academicYear"],
    where: {
      ...(levelFilter ? { level: levelFilter as any } : {}),
      academicYear: { not: null }
    },
    _count: { id: true },
    orderBy: { academicYear: "desc" }
  })

  const availableYears: { year: string; count: number }[] = yearGroups.map((g: any) => ({
    year: g.academicYear as string,
    count: g._count.id
  }))

  // Default: observasi terbaru (tahun ajaran tertinggi)
  const defaultYear = availableYears[0]?.year || "2027/2028"

  const stats = await getDashboardStats(levelFilter, defaultYear)

  return (
    <AdminOverviewClient 
      stats={stats} 
      role={session.user.role} 
      availableYears={availableYears}
      initialYear={defaultYear}
    />
  )
}
