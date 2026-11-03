/**
 * Data & aturan surat "Hasil Observasi dan Asesmen PPDB" SD/SMP. Murni (tanpa React/DOM) agar dipakai
 * halaman /surat, pembuat PDF, dan unduh massal dari daftar siswa.
 */
export type SuratStatus = "DITERIMA" | "DIPERTIMBANGKAN" | "TIDAK DITERIMA"
export type SuratUnit = "SD" | "SMP"

export const SURAT_STATUS_OPTIONS: SuratStatus[] = ["DITERIMA", "DIPERTIMBANGKAN", "TIDAK DITERIMA"]

export interface SuratNilai {
  mapel: string
  nilai: number
}

export interface SuratData {
  unit: SuratUnit
  nomor: string
  /** yyyy-mm-dd */
  tanggal: string
  /** Mis. "Gelombang 2". */
  gelombang: string
  tahunAjaran: string
  nama: string
  /** NIM siswa; juga dipakai sebagai kata sandi PDF. */
  nim: string
  tanggalPelaksanaan: string
  /** Kosong untuk SD (belum ada tes akademik); tabel nilai tidak ditampilkan. */
  nilai: SuratNilai[]
  status: SuratStatus
  kepalaSekolah: string
  /** Paragraf penutup setelah keputusan. */
  penutup: string
}

interface SuratUnitConfig {
  /** Nama sekolah kapital untuk kop. */
  namaKop: string
  /** Nama sekolah untuk kalimat. */
  nama: string
  /** Warna aksen kop (hex). */
  aksen: string
  logo: string
  /** Surat SMP memuat nilai asesmen; SD hanya observasi dan wawancara. */
  adaNilai: boolean
  kataHasil: string
}

export const SURAT_UNIT: Record<SuratUnit, SuratUnitConfig> = {
  SMP: {
    namaKop: "SMP ISLAM MODERN AL FAKHIR",
    nama: "SMP Islam Modern Al Fakhir",
    aksen: "#1a5f66",
    logo: "/logo-smp-surat.png",
    adaNilai: true,
    kataHasil: "observasi, asesmen, dan wawancara",
  },
  // Alamat/telepon kop SD belum ada di data; memakai kop yang sama dengan SMP. Ganti jika berbeda.
  SD: {
    namaKop: "SD ISLAM MODERN AL FAKHIR",
    nama: "SD Islam Modern Al Fakhir",
    aksen: "#c2610f",
    logo: "/logo-sd.png",
    adaNilai: false,
    kataHasil: "observasi dan wawancara",
  },
}

export const DEFAULT_KEPALA_SEKOLAH: Record<SuratUnit, string> = {
  SMP: "Nurhidayati, S.Pd.",
  SD: "",
}

const NAMA_MAPEL: Record<string, string> = {
  "Agama Islam": "Pendidikan Agama Islam",
  IPA: "Ilmu Pengetahuan Alam",
  IPS: "Ilmu Pengetahuan Sosial",
}

const STATUS_DARI_REKOMENDASI: Record<string, SuratStatus> = {
  Terima: "DITERIMA",
  Pertimbangkan: "DIPERTIMBANGKAN",
  Tolak: "TIDAK DITERIMA",
}

/**
 * Jenjang yang raportnya aktif. SD menyusul: template dan data tes SD belum ada. Konfigurasi SD tetap
 * disiapkan di SURAT_UNIT; tambahkan "SD" ke daftar ini untuk mengaktifkannya.
 */
export const SURAT_UNIT_AKTIF: SuratUnit[] = ["SMP"]

export function isSuratUnit(level: string): level is SuratUnit {
  return SURAT_UNIT_AKTIF.some((u) => u === level)
}

export function predikat(n: number) {
  if (n >= 86) return "A"
  if (n >= 71) return "B"
  if (n >= 56) return "C"
  return "D"
}

export function rataRata(nilai: SuratNilai[]) {
  return nilai.length ? nilai.reduce((sum, r) => sum + r.nilai, 0) / nilai.length : null
}

export function formatNilai(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",")
}

export function formatTanggalLong(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
}

/** "2026-11-03" -> "3 November 2026". */
export function formatTanggalIso(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? "" : formatTanggalLong(d)
}

export function statusDariRekomendasi(rekomendasi: string | null | undefined): SuratStatus | null {
  return rekomendasi ? (STATUS_DARI_REKOMENDASI[rekomendasi] ?? null) : null
}

export function defaultPenutup(status: SuratStatus, tahunAjaran: string, unit: SuratUnit) {
  const salam = "Demikian surat ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih."
  if (status !== "DITERIMA") return salam
  const diterima = `sebagai peserta didik baru ${SURAT_UNIT[unit].nama} Tahun Ajaran ${tahunAjaran}.`
  if (unit === "SMP") {
    return `${diterima} Selanjutnya, Ananda akan mengikuti **Mapping Al-Qur’an** melalui proses Standarisasi Al-Qur’an Al Fakhir. ${salam}`
  }
  return `${diterima} ${salam}`
}

export interface RichSegment {
  text: string
  bold: boolean
}

/** Memecah teks berpenanda `**tebal**` menjadi potongan biasa/tebal (dipakai pratinjau dan PDF). */
export function parseBold(text: string): RichSegment[] {
  return text
    .split("**")
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((seg) => seg.text.length > 0)
}

interface SubjectScore {
  correct: number
  total: number
}

export function parseNilai(raw: string | null | undefined): SuratNilai[] {
  if (!raw) return []
  try {
    const parsed: Record<string, SubjectScore> = JSON.parse(raw)
    return Object.entries(parsed)
      .filter(([, s]) => s.total > 0)
      .map(([mapel, s]) => ({
        mapel: NAMA_MAPEL[mapel] ?? mapel,
        nilai: Math.round((s.correct / s.total) * 100),
      }))
  } catch {
    return []
  }
}

export interface SuratCandidateInput {
  name: string
  level: string
  correctedName?: string | null
  academicYear?: string | null
  gelombang: number
  nim?: string | null
  academicTestResult?: { subjectScores: string; createdAt: Date | string } | null
  /** Dipakai sebagai tanggal pelaksanaan untuk siswa tanpa tes (SD). */
  createdAt: Date | string
  note?: { recommendation: string } | null
}

export interface SuratDefaults {
  nomor: string
  tanggal: string
  kepalaSekolah: string
}

export type SuratBuildResult = { ok: true; data: SuratData } | { ok: false; reason: "tes" | "keputusan" | "nim" | "jenjang" }

/** Bentuk data surat dari siswa. Gagal jika belum ada hasil tes (SMP), keputusan pewawancara, atau NIM. */
export function suratDariSiswa(c: SuratCandidateInput, defaults: SuratDefaults): SuratBuildResult {
  if (!isSuratUnit(c.level)) return { ok: false, reason: "jenjang" }
  const unit = c.level

  const nilai = SURAT_UNIT[unit].adaNilai ? parseNilai(c.academicTestResult?.subjectScores) : []
  if (SURAT_UNIT[unit].adaNilai && (!c.academicTestResult || nilai.length === 0)) return { ok: false, reason: "tes" }

  const status = statusDariRekomendasi(c.note?.recommendation)
  if (!status) return { ok: false, reason: "keputusan" }

  const nim = c.nim?.trim()
  if (!nim) return { ok: false, reason: "nim" }

  const tahunAjaran = c.academicYear ?? ""
  return {
    ok: true,
    data: {
      ...defaults,
      unit,
      gelombang: `Gelombang ${c.gelombang}`,
      tahunAjaran,
      nama: c.correctedName || c.name,
      nim,
      tanggalPelaksanaan: formatTanggalLong(new Date(c.academicTestResult?.createdAt ?? c.createdAt)),
      nilai,
      status,
      penutup: defaultPenutup(status, tahunAjaran, unit),
    },
  }
}
