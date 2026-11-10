import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { parseSdRaport, SD_JUMLAH_INDIKATOR } from "@/lib/raport-sd"
import RaportSdPageClient from "./raport-sd-page-client"

export const metadata: Metadata = {
  title: "Raport Observasi SD — Al Fakhir",
}

export const dynamic = "force-dynamic"

export default async function RaportSdPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isAdmin = session.user.role.startsWith("admin")
  if (session.user.role !== "interviewer" && !isAdmin) {
    redirect("/login")
  }

  // Mengambil semua siswa jenjang SD
  const candidates = await prisma.candidate.findMany({
    where: { level: "SD" },
    select: {
      id: true,
      name: true,
      originSchool: true,
      sdRaport: true,
      academicYear: true,
      gelombang: true,
      createdAt: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  const candidateList = candidates.map((c) => {
    const parsed = parseSdRaport(c.sdRaport)
    const filledCount = Object.keys(parsed.nilai).length
    return {
      id: c.id,
      name: c.name,
      originSchool: c.originSchool,
      sdRaport: c.sdRaport,
      academicYear: c.academicYear,
      gelombang: c.gelombang,
      filledCount,
      isComplete: filledCount === SD_JUMLAH_INDIKATOR,
    }
  })

  return (
    <RaportSdPageClient
      candidates={candidateList}
      observerName={session.user.name ?? ""}
    />
  )
}
