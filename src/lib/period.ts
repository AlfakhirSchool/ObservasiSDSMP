/**
 * Periode = tahun ajaran + gelombang pendaftaran. Dipakai untuk menampilkan data terbaru
 * lebih dulu dan menyembunyikan data periode lama sampai diminta.
 */
export interface PeriodFields {
  academicYear?: string | null
  gelombang: number
}

export interface PeriodOption {
  key: string
  label: string
  count: number
}

/** Nilai filter: "latest" (default), "all", atau key periode tertentu. */
export type PeriodFilterValue = string

export const PERIOD_LATEST = "latest"
export const PERIOD_ALL = "all"

export function periodKey(c: PeriodFields) {
  return `${c.academicYear ?? "-"}|${c.gelombang}`
}

export function periodLabel(c: PeriodFields) {
  return `Gelombang ${c.gelombang} · TA ${c.academicYear ?? "-"}`
}

/** Tahun ajaran dibandingkan sebagai teks ("2027/2028" > "2026/2027"), lalu nomor gelombang. */
function comparePeriodDesc(a: PeriodFields, b: PeriodFields) {
  const year = (b.academicYear ?? "").localeCompare(a.academicYear ?? "")
  return year !== 0 ? year : b.gelombang - a.gelombang
}

/** Daftar periode yang ada di data, terbaru dulu. */
export function listPeriods(items: PeriodFields[]): PeriodOption[] {
  const map = new Map<string, PeriodOption & { sample: PeriodFields }>()
  for (const item of items) {
    const key = periodKey(item)
    const existing = map.get(key)
    if (existing) existing.count++
    else map.set(key, { key, label: periodLabel(item), count: 1, sample: item })
  }
  return [...map.values()]
    .sort((a, b) => comparePeriodDesc(a.sample, b.sample))
    .map(({ key, label, count }) => ({ key, label, count }))
}

export function filterByPeriod<T extends PeriodFields>(items: T[], value: PeriodFilterValue, periods: PeriodOption[]): T[] {
  if (value === PERIOD_ALL) return items
  if (value.startsWith("year:")) {
    const targetYear = value.slice(5)
    return items.filter((item) => (item.academicYear ?? "-") === targetYear)
  }
  if (value === PERIOD_LATEST) {
    const latestYear = periods[0]?.key.split("|")[0]
    if (latestYear) {
      return items.filter((item) => (item.academicYear ?? "-") === latestYear)
    }
  }
  const key = value === PERIOD_LATEST ? periods[0]?.key : value
  return key ? items.filter((item) => periodKey(item) === key) : items
}

/**
 * Periode awal untuk tampilan hasil: "latest" bila periode terbaru sudah punya isian, jika tidak periode terbaru
 * yang sudah ada isiannya. Mencegah halaman depan tampak kosong tepat setelah periode baru dibuka.
 */
export function periodeAwalBerisi<T extends PeriodFields>(items: T[], punyaIsian: (item: T) => boolean): PeriodFilterValue {
  const periods = listPeriods(items)
  const terbaruBerisi = periods.find((p) => items.some((item) => periodKey(item) === p.key && punyaIsian(item)))
  return terbaruBerisi && terbaruBerisi.key !== periods[0]?.key ? terbaruBerisi.key : PERIOD_LATEST
}
