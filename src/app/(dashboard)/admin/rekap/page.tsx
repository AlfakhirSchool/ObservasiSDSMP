import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getRekapForm } from "@/lib/rekap-form"
import { getRekapSd } from "@/lib/rekap-sd"
import { RekapHasil } from "@/components/rekap-hasil"

export const metadata: Metadata = { title: "Rekap Hasil" }

export const dynamic = "force-dynamic"

export default async function AdminRekapPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const [sdRaport, sdOrangTua, smpOrangTua, smpSiswa] = await Promise.all([
    getRekapSd(),
    getRekapForm("SD", "ORANG TUA"),
    getRekapForm("SMP", "ORANG TUA"),
    getRekapForm("SMP", "SISWA"),
  ])

  return <RekapHasil sdRaport={sdRaport} sdOrangTua={sdOrangTua} smpOrangTua={smpOrangTua} smpSiswa={smpSiswa} detailBase="/admin/candidates" />
}
