"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlarmClock, CheckCheck, Pause, RefreshCw, Timer, WifiOff } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { useTick } from "@/components/interview-timer"
import { cn } from "@/lib/utils"
import {
  TIMER_MAX_SEC,
  entryElapsedMs,
  entryFinished,
  entryRemainingSec,
  formatRemaining,
  timerPhase,
  type TimerEntry,
  type TimerPhase,
} from "@/lib/interview-timer"
import type { AdminTimerPayload, AdminTimerRow } from "@/lib/interview-timer-server"

const POLL_MS = 5000
/** Timer berjalan tanpa kiriman status lebih lama dari ini → pewawancara kemungkinan offline/menutup browser. */
const NO_SIGNAL_MS = 90_000

type UnitFilter = "SEMUA" | "SD" | "SMP"
type RowState = "berjalan" | "hampir" | "lewat" | "jeda" | "berhenti"

interface Snapshot {
  data: AdminTimerPayload
  /** Selisih jam server terhadap jam perangkat ini saat data diambil (ms). */
  offset: number
}

const STATE_LABEL: Record<RowState, string> = {
  berjalan: "Berjalan",
  hampir: "Hampir habis",
  lewat: "Lewat 8 menit",
  jeda: "Dijeda",
  berhenti: "Berhenti (batas 10 menit)",
}
const STATE_PILL: Record<RowState, string> = {
  berjalan: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  hampir: "bg-amber-50 text-amber-700 ring-amber-200",
  lewat: "bg-rose-50 text-rose-700 ring-rose-200",
  jeda: "bg-slate-100 text-slate-600 ring-slate-200",
  berhenti: "bg-rose-50 text-rose-700 ring-rose-200",
}
const PHASE_TEXT: Record<TimerPhase, string> = { normal: "text-emerald-700", warn: "text-amber-600", over: "text-rose-600" }
const PHASE_BAR: Record<TimerPhase, string> = { normal: "bg-emerald-500", warn: "bg-amber-500", over: "bg-rose-500" }
const PILL_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
const SELECT =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"

interface ViewRow {
  row: AdminTimerRow
  entry: TimerEntry
  remaining: number
  phase: TimerPhase
  state: RowState
  progress: number
  noSignal: boolean
}

function toViewRow(row: AdminTimerRow, serverNow: number): ViewRow {
  const entry: TimerEntry = {
    candidateId: row.candidateId,
    name: row.candidateName,
    unit: row.level,
    startedAt: row.startedAt,
    elapsedMs: row.elapsedMs,
    updatedAt: row.updatedAt,
    ack: 0,
  }
  const remaining = entryRemainingSec(entry, serverNow)
  const phase = timerPhase(remaining)
  const finished = entryFinished(entry, serverNow)
  const running = row.startedAt !== null && !finished
  const state: RowState = finished ? "berhenti" : !running ? "jeda" : phase === "over" ? "lewat" : phase === "warn" ? "hampir" : "berjalan"
  return {
    row,
    entry,
    remaining,
    phase,
    state,
    progress: Math.min(100, (entryElapsedMs(entry, serverNow) / (TIMER_MAX_SEC * 1000)) * 100),
    noSignal: running && serverNow - row.updatedAt > NO_SIGNAL_MS,
  }
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Memuat timer">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-52 animate-pulse rounded bg-slate-100" />
          <div className="ml-auto h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

export default function TimerMonitorClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [unit, setUnit] = useState<UnitFilter>("SEMUA")
  const now = useTick(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/interview-timers", { cache: "no-store" })
      if (!res.ok) throw new Error(`Server merespons dengan kode ${res.status}`)
      const data = (await res.json()) as AdminTimerPayload
      setSnapshot({ data, offset: data.serverNow - Date.now() })
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
    const first = window.setTimeout(() => void load(), 0)
    const id = window.setInterval(() => {
      if (!document.hidden) void load()
    }, POLL_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [load])

  const refreshNow = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const serverNow = now + (snapshot?.offset ?? 0)

  const rows = useMemo<ViewRow[]>(() => {
    if (!snapshot) return []
    return snapshot.data.rows
      .filter((r) => unit === "SEMUA" || r.level === unit)
      .map((r) => toViewRow(r, serverNow))
      .sort((a, b) => {
        const aLive = a.state === "jeda" || a.state === "berhenti" ? 1 : 0
        const bLive = b.state === "jeda" || b.state === "berhenti" ? 1 : 0
        return aLive - bLive || a.remaining - b.remaining
      })
  }, [snapshot, unit, serverNow])

  const counts = {
    live: rows.filter((r) => r.state === "berjalan" || r.state === "hampir").length,
    over: rows.filter((r) => r.state === "lewat").length,
    stopped: rows.filter((r) => r.state === "berhenti").length,
    paused: rows.filter((r) => r.state === "jeda").length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitor Timer Wawancara"
        description="Pantau timer 8 menit (maks. 10 menit) pewawancara orang tua secara langsung. Hanya informasi; tidak membatasi wawancara."
        actions={
          <>
            <select aria-label="Filter unit" value={unit} onChange={(e) => setUnit(e.target.value as UnitFilter)} className={SELECT}>
              <option value="SEMUA">Semua unit</option>
              <option value="SD">Unit SD</option>
              <option value="SMP">Unit SMP</option>
            </select>
            <button
              type="button"
              onClick={refreshNow}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : undefined} aria-hidden="true" />
              Segarkan
            </button>
          </>
        }
      />

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">Jaringan bermasalah</p>
            <p className="text-amber-800">{error} Mencoba lagi otomatis tiap {POLL_MS / 1000} detik.</p>
          </div>
          <button type="button" onClick={refreshNow} className="rounded-lg border border-amber-300 bg-white px-3 py-1 font-semibold hover:bg-amber-100">
            Coba Lagi
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sedang berjalan" value={counts.live} icon={Timer} tone="emerald" />
        <StatCard label="Lewat 8 menit" value={counts.over} icon={AlarmClock} tone="rose" hint="Dalam tambahan waktu" />
        <StatCard label="Berhenti (10 menit)" value={counts.stopped} icon={CheckCheck} tone="amber" />
        <StatCard label="Dijeda" value={counts.paused} icon={Pause} tone="slate" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!snapshot ? (
          error ? (
            <EmptyState icon={WifiOff} title="Belum bisa memuat timer" description="Periksa koneksi lalu tekan Coba Lagi." />
          ) : (
            <SkeletonRows />
          )
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="Belum ada timer aktif"
            description="Timer muncul di sini otomatis saat pewawancara orang tua mengklik nama siswa."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {["Pewawancara", "Siswa", "Status", "Waktu", "Sinyal"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ row, remaining, phase, state, progress, noSignal }) => (
                  <tr key={`${row.interviewerName}:${row.candidateId}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.interviewerName}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/candidates/${row.candidateId}`}
                        className="font-medium text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {row.candidateName}
                      </Link>
                      <span className="ml-2 text-xs font-semibold text-slate-400">{row.level}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(PILL_BASE, STATE_PILL[state])}>{STATE_LABEL[state]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={cn("text-lg font-bold tabular-nums leading-tight", PHASE_TEXT[phase])}>{formatRemaining(remaining)}</p>
                      <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        <div className={cn("h-full rounded-full", PHASE_BAR[phase])} style={{ width: `${progress}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {noSignal ? (
                        <span
                          className={cn(PILL_BASE, "bg-amber-50 text-amber-700 ring-amber-200")}
                          title="Tidak ada kiriman status dari perangkat pewawancara lebih dari 90 detik"
                        >
                          Tanpa sinyal
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Terhubung</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
