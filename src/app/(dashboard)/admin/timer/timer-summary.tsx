"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlarmClock, CheckCircle2, ClipboardCheck, Hourglass, Inbox, Timer, WifiOff } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { formatRemaining } from "@/lib/interview-timer"
import type { SummaryScope, TimerSummaryPayload } from "@/lib/interview-timer-server"

const REFRESH_MS = 30_000
const SEGMENT = "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

/** 07:12; "-" jika tidak ada data durasi. */
const durasi = (seconds: number | null) => (seconds === null ? "-" : formatRemaining(seconds))

/** Jam simpan dalam WIB, mis. 09.41. */
const jam = (ms: number) =>
  new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })

/**
 * Rekap wawancara yang sudah selesai disimpan (catatan terkunci): hitungan per pewawancara, rata-rata durasi,
 * dan daftar "Baru selesai menyimpan". Siswa yang sudah selesai sengaja tidak ada di daftar timer aktif.
 */
export function FinishedSummary() {
  const [scope, setScope] = useState<SummaryScope>("today")
  const [data, setData] = useState<TimerSummaryPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (s: SummaryScope) => {
    try {
      const res = await fetch(`/api/admin/interview-timers/summary?scope=${s}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Server merespons dengan kode ${res.status}`)
      const payload = (await res.json()) as TimerSummaryPayload
      setData(payload)
      setError(null)
    } catch {
      setError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "Perangkat Anda sedang offline."
          : "Server tidak dapat dijangkau. Data yang tampil mungkin sudah tidak terbaru.",
      )
    }
  }, [])

  useEffect(() => {
    const first = window.setTimeout(() => void load(scope), 0)
    const id = window.setInterval(() => {
      if (!document.hidden) void load(scope)
    }, REFRESH_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [load, scope])

  // Data dari rentang lain yang masih tampil sesaat saat berpindah dianggap belum siap.
  const ready = data !== null && data.scope === scope

  return (
    <section className="space-y-4" aria-label="Rekap wawancara selesai">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rekap wawancara selesai</h2>
          <p className="text-sm text-slate-500">
            Dihitung dari catatan yang sudah dikirim dan dikunci. Durasi hanya ada untuk wawancara yang memakai timer.
          </p>
        </div>
        <div role="group" aria-label="Rentang rekap" className="inline-flex self-start rounded-xl bg-slate-100 p-1">
          {(
            [
              ["today", "Hari ini"],
              ["all", "Semua"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
              className={cn(SEGMENT, scope === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <WifiOff size={16} className="shrink-0" aria-hidden="true" />
          <p className="flex-1">
            <span className="font-semibold">Jaringan bermasalah.</span> {error}
          </p>
          <button type="button" onClick={() => void load(scope)} className="rounded-lg border border-amber-300 bg-white px-3 py-1 font-semibold hover:bg-amber-100">
            Coba Lagi
          </button>
        </div>
      )}

      {!ready ? (
        error ? null : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Memuat rekap">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[90px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Selesai disimpan" value={data.totals.done} icon={ClipboardCheck} tone="emerald" />
            <StatCard
              label="Rata-rata durasi"
              value={durasi(data.totals.avgSeconds)}
              icon={Hourglass}
              tone="blue"
              hint={data.totals.timed > 0 ? `dari ${data.totals.timed} wawancara berdurasi` : "belum ada data durasi"}
            />
            <StatCard label="Lewat 8 menit" value={data.totals.over8} icon={AlarmClock} tone="amber" />
            <StatCard label="Mencapai batas 10 menit" value={data.totals.atCap} icon={Timer} tone="rose" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {["Pewawancara", "Selesai disimpan", "Rata-rata durasi", "Lewat 8 menit", "Batas 10 menit"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.perInterviewer.map((p) => (
                    <tr key={p.name}>
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className={cn("px-4 py-3 font-semibold tabular-nums", p.done > 0 ? "text-slate-900" : "text-slate-400")}>{p.done}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{durasi(p.avgSeconds)}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{p.over8}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{p.atCap}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold text-slate-900">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 tabular-nums">{data.totals.done}</td>
                    <td className="px-4 py-3 tabular-nums">{durasi(data.totals.avgSeconds)}</td>
                    <td className="px-4 py-3 tabular-nums">{data.totals.over8}</td>
                    <td className="px-4 py-3 tabular-nums">{data.totals.atCap}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900">Baru selesai menyimpan</h3>
            </div>
            {data.recent.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={scope === "today" ? "Belum ada yang selesai menyimpan hari ini" : "Belum ada wawancara yang selesai disimpan"}
                description="Muncul di sini otomatis setelah pewawancara menekan Simpan & kunci hasil."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recent.map((r) => (
                  <li key={r.candidateId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <CheckCircle2 size={13} aria-hidden="true" />
                      Sudah disimpan
                    </span>
                    <span className="font-medium text-slate-900">{r.interviewerName}</span>
                    <Link href={`/admin/candidates/${r.candidateId}`} className="text-slate-700 hover:text-emerald-700 hover:underline">
                      {r.candidateName} <span className="text-xs font-semibold text-slate-400">{r.level}</span>
                    </Link>
                    <span className="ml-auto flex items-center gap-4 text-xs text-slate-500 tabular-nums">
                      <span>Durasi {durasi(r.seconds)}</span>
                      <span>Pukul {jam(r.savedAt)} WIB</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
