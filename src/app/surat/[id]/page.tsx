import { auth } from "@/lib/auth"
import { getCandidateById } from "@/lib/data-service"
import { notFound, redirect } from "next/navigation"
import {
  DEFAULT_KEPALA_SEKOLAH,
  SURAT_UNIT,
  formatTanggalLong,
  isSuratUnit,
  parseNilai,
  statusDariRekomendasi,
} from "@/lib/surat"
import SuratClient from "./surat-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Surat Hasil Observasi dan Asesmen PPDB — Al Fakhir",
}

export default async function SuratHasilPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const { id } = await params
  const candidate = await getCandidateById(id)
  if (!candidate || !isSuratUnit(candidate.level)) notFound()

  const unit = candidate.level
  const testResult = candidate.academicTestResult
  const nilai = SURAT_UNIT[unit].adaNilai ? parseNilai(testResult?.subjectScores) : []

  return (
    <SuratClient
      initial={{
        unit,
        nomor: "",
        tanggal: new Date().toISOString().slice(0, 10),
        gelombang: `Gelombang ${candidate.gelombang}`,
        tahunAjaran: candidate.academicYear || "",
        nama: candidate.correctedName || candidate.name,
        nim: candidate.nim ?? "",
        tanggalPelaksanaan: formatTanggalLong(testResult?.createdAt ?? candidate.createdAt),
        nilai,
        status: statusDariRekomendasi(candidate.notes[0]?.recommendation) ?? "",
        kepalaSekolah: DEFAULT_KEPALA_SEKOLAH[unit],
      }}
    />
  )
}
