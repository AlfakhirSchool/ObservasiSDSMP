import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getRekapForm } from "@/lib/rekap-form"
import { getRekapSd } from "@/lib/rekap-sd"
import { RekapHasil } from "@/components/rekap-hasil"

export const metadata: Metadata = { title: "Rekap Hasil" }

export const dynamic = "force-dynamic"

export default async function InterviewerRekapPage() {
  const session = await auth()
  const user = session?.user
  if (!user) redirect("/login")

  const isAdmin = user.role.startsWith("admin")
  if (user.role !== "interviewer" && !isAdmin) redirect("/login")
  // Nama kosong akan membuat semua tautan terbuka (dianggap admin), jadi tolak.
  if (!isAdmin && !user.name) redirect("/login")

  // Semua pewawancara boleh melihat hasil semua siswa. Detail siswa tetap hanya bisa dibuka guru pemiliknya
  // (ownerName), sehingga siswa guru lain tampil sebagai teks biasa, bukan tautan.
  const [sdRaport, sdOrangTua, smpOrangTua, smpSiswa] = await Promise.all([
    getRekapSd(),
    getRekapForm("SD", "ORANG TUA"),
    getRekapForm("SMP", "ORANG TUA"),
    getRekapForm("SMP", "SISWA"),
  ])

  return (
    <RekapHasil
      sdRaport={sdRaport}
      sdOrangTua={sdOrangTua}
      smpOrangTua={smpOrangTua}
      smpSiswa={smpSiswa}
      ownerName={isAdmin ? undefined : (user.name ?? "")}
      detailBase={isAdmin ? "/admin/candidates" : "/interviewer"}
    />
  )
}
