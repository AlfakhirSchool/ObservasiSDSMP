import { prisma } from "@/lib/prisma"
import { SD_INDIKATOR_KODE, parseSdRaport, type SdNilaiMap } from "@/lib/raport-sd"

/** Satu baris rekap: hasil raport SD seorang siswa. Sengaja tanpa NIM (NIM adalah kata sandi PDF). */
export interface RekapSdRow {
  id: string
  nama: string
  asalSekolah: string
  /** Nama pewawancara yang ditugaskan; kosong bila belum ada. */
  guru: string
  gelombang: number
  academicYear: string | null
  nilai: SdNilaiMap
  terisi: number
  /** Keputusan pewawancara (Terima / Pertimbangkan / Tolak) dari catatan observasi. */
  keputusan: string | null
}

/** Rekap hasil raport SD semua siswa SD. Pewawancara dan admin sama-sama boleh melihat semuanya. */
export async function getRekapSd(): Promise<RekapSdRow[]> {
  const candidates = await prisma.candidate.findMany({
    where: { level: "SD" },
    select: {
      id: true,
      name: true,
      correctedName: true,
      originSchool: true,
      selectedInterviewer: true,
      gelombang: true,
      academicYear: true,
      sdRaport: true,
      notes: { select: { recommendation: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  })

  return candidates.map((c) => {
    const { nilai } = parseSdRaport(c.sdRaport)
    return {
      id: c.id,
      nama: c.correctedName || c.name,
      asalSekolah: c.originSchool ?? "",
      guru: c.selectedInterviewer ?? "",
      gelombang: c.gelombang,
      academicYear: c.academicYear,
      nilai,
      terisi: SD_INDIKATOR_KODE.filter((k) => nilai[k] !== undefined).length,
      keputusan: c.notes[0]?.recommendation ?? null,
    }
  })
}
