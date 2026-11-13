/** Observasi Al-Qur'an: tes baca 2 halaman per siswa, dinilai A/B/C oleh ustadz penguji, plus catatan manual. */
export type QuranNilai = "A" | "B" | "C"

export const QURAN_NILAI_URUT: QuranNilai[] = ["A", "B", "C"]

export const QURAN_NILAI_KETERANGAN: Record<QuranNilai, string> = {
  A: "Kedua halaman benar",
  B: "Halaman 1 benar, halaman 2 salah",
  C: "Halaman 1 salah (tidak bisa lanjut ke halaman 2)",
}

/** Warna badge/tombol tiap nilai. */
export const QURAN_NILAI_TONE: Record<QuranNilai, string> = {
  A: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-emerald-200",
  B: "border-amber-500 bg-amber-50 text-amber-700 ring-amber-200",
  C: "border-rose-500 bg-rose-50 text-rose-700 ring-rose-200",
}

export const QURAN_CATATAN_MAKS = 600

export function isQuranNilai(v: unknown): v is QuranNilai {
  return v === "A" || v === "B" || v === "C"
}
