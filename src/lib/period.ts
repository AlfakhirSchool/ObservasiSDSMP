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
  const key = value === PERIOD_LATEST ? periods[0]?.key : value
  return key ? items.filter((item) => periodKey(item) === key) : items
}
