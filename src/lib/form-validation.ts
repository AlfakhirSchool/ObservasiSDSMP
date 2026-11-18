/** Validasi isian formulir yang dipakai bersama oleh formulir publik, API pengiriman, dan edit jawaban admin. */

const CONTOH = "Contoh: Depok, 12 Maret 2020"

const BULAN: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2, pebruari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, agt: 8, ags: 8, agus: 8, agustus: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, nop: 11, november: 11, nopember: 11,
  des: 12, desember: 12,
}

const TANGGAL_NUMERIK = /(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})/
const TANGGAL_TEKS = /(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})/i

/** Soal "Tempat dan Tanggal Lahir ..." dikenali dari teksnya karena id soal bisa berganti saat dibuat ulang. */
const SOAL_TTL = /^tempat\s*(?:dan|&)\s*tanggal\s*lahir/i

function cariTanggal(teks: string) {
  const numerik = TANGGAL_NUMERIK.exec(teks)
  if (numerik) return { cocok: numerik[0], day: Number(numerik[1]), month: Number(numerik[2]), year: Number(numerik[3]) }
  const huruf = TANGGAL_TEKS.exec(teks)
  const month = huruf ? BULAN[huruf[2].toLowerCase()] : undefined
  return huruf && month ? { cocok: huruf[0], day: Number(huruf[1]), month, year: Number(huruf[3]) } : null
}

/** Pesan galat untuk isian tempat dan tanggal lahir, atau null bila lengkap (tempat + tanggal + bulan + tahun yang wajar). */
export function tanggalLahirError(value: string): string | null {
  const teks = value.trim()
  const tanggal = cariTanggal(teks)
  if (!tanggal) return `Tanggal lahir belum lengkap: tulis tanggal, bulan, dan tahun. ${CONTOH}`

  const { day, month, year, cocok } = tanggal
  const lahir = new Date(Date.UTC(year, month - 1, day))
  const valid = lahir.getUTCFullYear() === year && lahir.getUTCMonth() === month - 1 && lahir.getUTCDate() === day
  if (!valid || year < 1990 || lahir.getTime() > Date.now()) return `Tanggal lahir tidak valid. ${CONTOH}`

  const tempat = teks.replace(cocok, "").replace(/[^\p{L}]/gu, "")
  if (tempat.length < 3) return `Tempat lahir belum ditulis. ${CONTOH}`
  return null
}

/** Galat format untuk satu jawaban yang sudah terisi (isian kosong ditangani aturan "wajib" terpisah), atau null. */
export function answerError(questionText: string, value: string): string | null {
  if (!value.trim()) return null
  return SOAL_TTL.test(questionText.trim()) ? tanggalLahirError(value) : null
}
