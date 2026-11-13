import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getRekapForm } from "@/lib/rekap-form"
import { getRekapSd } from "@/lib/rekap-sd"
import { RekapHasil } from "@/components/rekap-hasil"

export const metadata: Metadata = { title: "Rekap Hasil — Al Fakhir" }

export const dynamic = "force-dynamic"

const EMPTY_FORM_DATA = { questions: [], rows: [], wajibTotal: 0 }

interface Props {
  searchParams: Promise<{ unit?: string }>
}

export default async function InterviewerRekapPage({ searchParams }: Props) {
  const session = await auth()
  const user = session?.user
  if (!user) redirect("/login")

  const isAdmin = user.role.startsWith("admin")
  if (user.role !== "interviewer" && !isAdmin) redirect("/login")
  if (!isAdmin && !user.name) redirect("/login")

  const { unit } = await searchParams
  const lockedUnit = unit?.toUpperCase() === "SMP" ? "SMP" : "SD"

  if (lockedUnit === "SD") {
    const [sdRaport, sdOrangTua] = await Promise.all([
      getRekapSd(),
      getRekapForm("SD", "ORANG TUA"),
    ])
    return (
      <RekapHasil
        sdRaport={sdRaport}
        sdOrangTua={sdOrangTua}
        smpOrangTua={EMPTY_FORM_DATA}
        smpSiswa={EMPTY_FORM_DATA}
        ownerName={isAdmin ? undefined : (user.name ?? "")}
        detailBase={isAdmin ? "/admin/candidates" : "/interviewer"}
        lockedUnit="SD"
      />
    )
  }

  const [smpOrangTua, smpSiswa] = await Promise.all([
    getRekapForm("SMP", "ORANG TUA"),
    getRekapForm("SMP", "SISWA"),
  ])

  return (
    <RekapHasil
      sdRaport={[]}
      sdOrangTua={EMPTY_FORM_DATA}
      smpOrangTua={smpOrangTua}
      smpSiswa={smpSiswa}
      ownerName={isAdmin ? undefined : (user.name ?? "")}
      detailBase={isAdmin ? "/admin/candidates" : "/interviewer"}
      lockedUnit="SMP"
    />
  )
}
