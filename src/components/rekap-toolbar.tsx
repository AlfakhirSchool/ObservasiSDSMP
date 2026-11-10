"use client"

import { useState } from "react"
import { FileSpreadsheet, Search } from "lucide-react"
import { PeriodFilter } from "@/components/ui/period-filter"
import type { PeriodFilterValue, PeriodOption } from "@/lib/period"
import { cn } from "@/lib/utils"

export type StatusFilter = "semua" | "lengkap" | "sebagian" | "belum"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "semua", label: "Semua status" },
  { value: "lengkap", label: "Lengkap" },
  { value: "sebagian", label: "Sebagian" },
  { value: "belum", label: "Belum diisi" },
]

/** Cocokkan jumlah isian (terisi dari total) dengan pilihan filter status. */
export function cocokStatus(terisi: number, total: number, status: StatusFilter) {
  if (status === "lengkap") return terisi === total
  if (status === "sebagian") return terisi > 0 && terisi < total
  if (status === "belum") return terisi === 0
  return true
}

/** Siswa milik pewawancara yang sedang login dipindah ke atas; urutan lainnya tetap (sort stabil). */
export function milikSayaDulu<T extends { guru: string }>(rows: T[], ownerName: string | undefined): T[] {
  if (!ownerName) return rows
  return [...rows].sort((a, b) => Number(b.guru === ownerName) - Number(a.guru === ownerName))
}

const CONTROL =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"

interface Props {
  periods: PeriodOption[]
  period: PeriodFilterValue
  onPeriod: (value: PeriodFilterValue) => void
  query: string
  onQuery: (value: string) => void
  gurus: string[]
  guru: string
  onGuru: (value: string) => void
  status: StatusFilter
  onStatus: (value: StatusFilter) => void
  searchLabel: string
  /** Bila diisi, tampil tombol "Unduh Excel" yang mengekspor baris yang sedang tampil. */
  onExport?: () => void | Promise<void>
}

/** Baris penyaring di atas tabel rekap: periode, pencarian, guru, dan status pengisian. */
export function RekapToolbar({ periods, period, onPeriod, query, onQuery, gurus, guru, onGuru, status, onStatus, searchLabel, onExport }: Props) {
  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    if (!onExport) return
    setExporting(true)
    try {
      await onExport()
    } catch (err) {
      console.error(err)
      alert("Gagal mengunduh Excel. Coba lagi.")
    } finally {
      setExporting(false)
    }
  }
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-start">
      <PeriodFilter periods={periods} value={period} onChange={onPeriod} />
      <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
        <Search size={16} className="pointer-events-none absolute left-3 top-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          aria-label={searchLabel}
          placeholder={`${searchLabel}...`}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className={cn(CONTROL, "w-full pl-9")}
        />
      </div>
      <select aria-label="Filter guru" value={guru} onChange={(e) => onGuru(e.target.value)} className={CONTROL}>
        <option value="">Semua guru</option>
        {gurus.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select aria-label="Filter status pengisian" value={status} onChange={(e) => onStatus(e.target.value as StatusFilter)} className={CONTROL}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {onExport && (
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-wait disabled:opacity-60"
        >
          <FileSpreadsheet size={16} aria-hidden="true" />
          {exporting ? "Menyiapkan..." : "Unduh Excel"}
        </button>
      )}
    </div>
  )
}
