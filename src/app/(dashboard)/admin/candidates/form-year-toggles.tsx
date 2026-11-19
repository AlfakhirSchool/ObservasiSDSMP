"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { setFormYearOpen } from "@/lib/form-year-actions"

export interface FormYearRow {
  year: string
  students: number
  open: boolean
}

/** Saklar buka/tutup tiap tahun ajaran di portal formulir /form (agar wali murid tahun lama tidak ikut terlihat). */
export default function FormYearToggles({ years }: { years: FormYearRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = (row: FormYearRow) => {
    setBusy(row.year)
    startTransition(async () => {
      try {
        const res = await setFormYearOpen({ academicYear: row.year, open: !row.open })
        if (!res.ok) throw new Error(res.error)
        toast.success(`${row.year} ${row.open ? "ditutup" : "dibuka"} di portal formulir`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal mengubah tahun ajaran")
      } finally {
        setBusy(null)
      }
    })
  }

  if (years.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CalendarDays size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Tahun ajaran di portal formulir</h2>
          <p className="text-xs text-slate-500">
            Tahun yang dimatikan tidak muncul di halaman /form untuk wali murid. Tautan atau QR per siswa tetap bisa dipakai.
          </p>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {years.map((row) => (
          <li key={row.year} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">{row.year}</div>
              <div className="text-[11px] text-slate-500">{row.students} siswa</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={row.open}
              aria-label={`Tahun ajaran ${row.year} ${row.open ? "aktif" : "nonaktif"} di portal formulir`}
              disabled={pending}
              onClick={() => toggle(row)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60",
                row.open ? "bg-emerald-500" : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  row.open ? "left-[22px]" : "left-0.5",
                  busy === row.year && "animate-pulse",
                )}
              />
            </button>
            <span className={cn("w-12 text-xs font-semibold", row.open ? "text-emerald-700" : "text-slate-500")}>
              {row.open ? "Aktif" : "Mati"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
