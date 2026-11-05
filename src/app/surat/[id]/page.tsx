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
import RaportSdClient from "./raport-sd-client"
import { prisma } from "@/lib/prisma"
import { SD_DEFAULT_KEPALA_SEKOLAH, SD_DEFAULT_KETUA_PELAKSANA } from "@/lib/raport-sd"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Surat Hasil Observasi dan Asesmen PPDB — Al Fakhir",
}

export default async function SuratHasilPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const { id } = await params
  const candidate = await getCandidateById(id)
  if (!candidate) notFound()

  // Raport SD berbentuk lain dari surat SMP: editor tersendiri dengan pratinjau PDF.
  if (candidate.level === "SD") {
    const jumlahSiswa = await prisma.candidate.count({
      where: { level: "SD", academicYear: candidate.academicYear, gelombang: candidate.gelombang },
    })
    return (
      <RaportSdClient
        initial={{
          nama: candidate.correctedName || candidate.name,
          asalSekolah: candidate.originSchool ?? "",
          nim: candidate.nim ?? "",
          gelombang: candidate.gelombang,
          jumlahSiswa,
          tanggal: new Date().toISOString().slice(0, 10),
          kepalaSekolah: SD_DEFAULT_KEPALA_SEKOLAH,
          ketuaPelaksana: SD_DEFAULT_KETUA_PELAKSANA,
          status: statusDariRekomendasi(candidate.notes[0]?.recommendation) ?? "",
          sdRaport: candidate.sdRaport,
        }}
      />
    )
  }

  if (!isSuratUnit(candidate.level)) notFound()

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
