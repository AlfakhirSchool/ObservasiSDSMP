"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { PERIOD_ALL, PERIOD_LATEST, type PeriodFilterValue, type PeriodOption } from "@/lib/period"

interface PeriodFilterProps {
  periods: PeriodOption[]
  value: PeriodFilterValue
  onChange: (value: PeriodFilterValue) => void
  className?: string
}

/**
 * Filter periode terpisah: Dropdown Tahun Masuk (TA) dan Dropdown Gelombang.
 * Menghilangkan penggabungan teks seperti "Gelombang 2 · TA 2026/2027",
 * sehingga tampilan ringkas dan data per tahun tidak memanjang.
 */
export function PeriodFilter({ periods, value, onChange, className }: PeriodFilterProps) {
  const parsed = useMemo(() => {
    return periods.map((p) => {
      const parts = p.key.split("|")
      const year = parts[0] || "-"
      const wave = Number(parts[1]) || 1
      return {
        key: p.key,
        year,
        wave,
        count: p.count,
      }
    })
  }, [periods])

  const total = useMemo(() => periods.reduce((sum, p) => sum + p.count, 0), [periods])

  // Urutan tahun ajaran unik (terbaru dulu)
  const years = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const p of parsed) {
      if (!seen.has(p.year)) {
        seen.add(p.year)
        list.push(p.year)
      }
    }
    return list
  }, [parsed])

  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of parsed) {
      counts[p.year] = (counts[p.year] ?? 0) + p.count
    }
    return counts
  }, [parsed])

  // Evaluasi tahun dan gelombang yang aktif
  const { activeYear, activeWave } = useMemo(() => {
    if (value === PERIOD_ALL) {
      return { activeYear: "ALL", activeWave: "ALL" }
    }
    if (value === PERIOD_LATEST) {
      return { activeYear: years[0] ?? "ALL", activeWave: "ALL" }
    }
    if (value.startsWith("year:")) {
      return { activeYear: value.slice(5), activeWave: "ALL" }
    }
    if (value.includes("|")) {
      const [yr, wv] = value.split("|")
      return { activeYear: yr, activeWave: wv }
    }
    return { activeYear: years[0] ?? "ALL", activeWave: "ALL" }
  }, [value, years])

  // Gelombang yang tersedia untuk tahun yang sedang dipilih
  const availableWaves = useMemo(() => {
    if (activeYear === "ALL") {
      const waveMap = new Map<number, number>()
      for (const p of parsed) {
        waveMap.set(p.wave, (waveMap.get(p.wave) ?? 0) + p.count)
      }
      return Array.from(waveMap.entries())
        .map(([wave, count]) => ({ wave, count, key: `ALL|${wave}` }))
        .sort((a, b) => a.wave - b.wave)
    }
    return parsed
      .filter((p) => p.year === activeYear)
      .map((p) => ({ wave: p.wave, count: p.count, key: p.key }))
      .sort((a, b) => a.wave - b.wave)
  }, [parsed, activeYear])

  const handleYearChange = (newYear: string) => {
    if (newYear === "ALL") {
      onChange(PERIOD_ALL)
      return
    }
    // Jika tahun baru punya gelombang yang sedang aktif, pertahankan
    const hasSameWave = parsed.some((p) => p.year === newYear && String(p.wave) === activeWave)
    if (activeWave !== "ALL" && hasSameWave) {
      onChange(`${newYear}|${activeWave}`)
    } else {
      onChange(`year:${newYear}`)
    }
  }

  const handleWaveChange = (newWave: string) => {
    if (newWave === "ALL") {
      if (activeYear === "ALL") {
        onChange(PERIOD_ALL)
      } else {
        onChange(`year:${activeYear}`)
      }
      return
    }
    const targetYear = activeYear === "ALL" ? (years[0] ?? "-") : activeYear
    onChange(`${targetYear}|${newWave}`)
  }

  if (periods.length === 0) return null

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center", className)}>
      {/* 1. Dropdown Tahun Masuk / TA */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-tahun-select" className="w-[4.5rem] shrink-0 text-xs font-semibold text-slate-500 sm:w-auto">
          Tahun:
        </label>
        <select
          id="filter-tahun-select"
          aria-label="Tahun Masuk / TA"
          value={activeYear}
          onChange={(e) => handleYearChange(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          {years.map((y, idx) => (
            <option key={y} value={y}>
              TA {y} {idx === 0 ? "(Terbaru)" : ""} ({yearCounts[y]})
            </option>
          ))}
          <option value="ALL">Semua Tahun ({total})</option>
        </select>
      </div>

      {/* 2. Dropdown Gelombang */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-gelombang-select" className="w-[4.5rem] shrink-0 text-xs font-semibold text-slate-500 sm:w-auto">
          Gelombang:
        </label>
        <select
          id="filter-gelombang-select"
          aria-label="Gelombang"
          value={activeWave}
          onChange={(e) => handleWaveChange(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <option value="ALL">Semua Gelombang</option>
          {availableWaves.map((w) => (
            <option key={w.key} value={String(w.wave)}>
              Gelombang {w.wave} ({w.count})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
