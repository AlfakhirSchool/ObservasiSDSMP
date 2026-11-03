"use client"

import { cn } from "@/lib/utils"
import { PERIOD_ALL, PERIOD_LATEST, type PeriodFilterValue, type PeriodOption } from "@/lib/period"

interface PeriodFilterProps {
  periods: PeriodOption[]
  value: PeriodFilterValue
  onChange: (value: PeriodFilterValue) => void
  className?: string
}

/**
 * Pilihan periode. Default "latest" menampilkan hanya periode terbaru; periode lama tetap bisa
 * dibuka lewat pilihan ini atau tautan "Lihat data lama".
 */
export function PeriodFilter({ periods, value, onChange, className }: PeriodFilterProps) {
  if (periods.length === 0) return null

  const total = periods.reduce((sum, p) => sum + p.count, 0)
  const latest = periods[0]
  const hiddenCount = value === PERIOD_LATEST ? total - latest.count : 0

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <select
        aria-label="Periode data"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <option value={PERIOD_LATEST}>Terbaru: {latest.label} ({latest.count})</option>
        {periods.slice(1).map((p) => (
          <option key={p.key} value={p.key}>
            {p.label} ({p.count})
          </option>
        ))}
        <option value={PERIOD_ALL}>Semua periode ({total})</option>
      </select>
      {hiddenCount > 0 && (
        <p className="text-xs text-slate-500">
          {hiddenCount} data lama disembunyikan.{" "}
          <button
            type="button"
            onClick={() => onChange(PERIOD_ALL)}
            className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            Lihat data lama
          </button>
        </p>
      )}
    </div>
  )
}
