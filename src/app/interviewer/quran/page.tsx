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

export default async function QuranPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isAdmin = session.user.role.startsWith("admin")
  if (session.user.role !== "interviewer" && !isAdmin) redirect("/login")

  const candidates = await prisma.candidate.findMany({
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

  return <QuranPageClient rows={rows} homeHref={isAdmin ? "/admin" : "/interviewer/sd"} isAdmin={isAdmin} />
}
