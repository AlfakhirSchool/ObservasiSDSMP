import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { isQuranNilai } from "@/lib/quran"
import QuranPageClient from "./quran-page-client"

export const metadata: Metadata = {
  title: "Observasi Al-Qur'an — Al Fakhir",
}

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ unit?: string }>
}

export default async function QuranPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const isAdmin = session.user.role.startsWith("admin")
  if (session.user.role !== "interviewer" && !isAdmin) redirect("/login")

  const { unit } = await searchParams
  const activeUnit: "SD" | "SMP" = unit?.toUpperCase() === "SMP" ? "SMP" : "SD"

  const candidates = await prisma.candidate.findMany({
    where: { level: activeUnit },
    select: {
      id: true,
      name: true,
      correctedName: true,
      level: true,
      gelombang: true,
      academicYear: true,
      quranNilai: true,
      quranCatatan: true,
      quranDinilaiOleh: true,
    },
    orderBy: { name: "asc" },
  })

  const rows = candidates.map((c) => ({
    id: c.id,
    nama: c.correctedName || c.name,
    level: c.level,
    gelombang: c.gelombang,
    academicYear: c.academicYear,
    nilai: isQuranNilai(c.quranNilai) ? c.quranNilai : null,
    catatan: c.quranCatatan ?? "",
    dinilaiOleh: c.quranDinilaiOleh ?? "",
  }))

  return (
    <QuranPageClient
      rows={rows}
      activeUnit={activeUnit}
      homeHref={isAdmin ? "/admin" : activeUnit === "SD" ? "/interviewer/sd" : "/interviewer/smp"}
      isAdmin={isAdmin}
    />
  )
}
