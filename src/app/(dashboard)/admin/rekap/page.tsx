import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getRekapForm } from "@/lib/rekap-form"
import { getRekapSd } from "@/lib/rekap-sd"
import { getRekapAkademikSmp } from "@/lib/rekap-akademik"
import { RekapHasil } from "@/components/rekap-hasil"

export const metadata: Metadata = { title: "Rekap Hasil" }

export const dynamic = "force-dynamic"

export default async function AdminRekapPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const [sdRaport, sdOrangTua, smpOrangTua, smpSiswa, smpAkademik] = await Promise.all([
    getRekapSd(),
    getRekapForm("SD", "ORANG TUA"),
    getRekapForm("SMP", "ORANG TUA"),
    getRekapForm("SMP", "SISWA"),
    getRekapAkademikSmp(),
  ])

  return (
    <RekapHasil
      sdRaport={sdRaport}
      sdOrangTua={sdOrangTua}
      smpOrangTua={smpOrangTua}
      smpSiswa={smpSiswa}
      smpAkademik={smpAkademik}
      detailBase="/admin/candidates"
    />
  )
}
