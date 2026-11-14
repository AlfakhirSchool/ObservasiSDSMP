"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlarmClock, BellRing, CheckCheck, ChevronDown, ChevronUp, Pause, Play, RotateCcw, Timer, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  EMPTY_RAW,
  TIMER_DURATION_SEC,
  TIMER_MAX_SEC,
  ackTimer,
  entryElapsedMs,
  entryFinished,
  entryRawElapsedMs,
  entryRemainingSec,
  formatRemaining,
  parseEntries,
  pauseTimer,
  pendingAlert,
  readRaw,
  removeTimer,
  restartTimer,
  resumeTimer,
  SYNC_HEARTBEAT_MS,
  pushTimers,
  startTimer,
  subscribeTimers,
  timerPhase,
  type TimerEntry,
  type TimerPhase,
  type TimerTarget,
} from "@/lib/interview-timer"

// --- Detak 1 detik bersama (satu interval untuk semua komponen) --------------------------------------------------------

let lastTick = 0
let tickSubscribers = 0

function subscribeTick(callback: () => void): () => void {
  tickSubscribers += 1
  lastTick = Date.now()
  const id = window.setInterval(() => {
    lastTick = Date.now()
    callback()
  }, 1000)
  return () => {
    window.clearInterval(id)
    tickSubscribers -= 1
    if (tickSubscribers === 0) lastTick = 0 // snapshot berikutnya harus segar, bukan sisa lama
  }
}
const subscribeNever = () => () => {}
const getTickSnapshot = () => lastTick || (lastTick = Date.now())
const getTickServerSnapshot = () => 0

// --- Bunyi + getar saat pemberitahuan muncul (gagal diam-diam jika browser memblokir) ------------------------------------

function signalAlert(beeps: number): void {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // perangkat tanpa getar
  }
  try {
    if (typeof window.AudioContext === "undefined") return
    const ctx = new window.AudioContext()
    const t0 = ctx.currentTime
    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.4)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.4 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.4 + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + i * 0.4)
      osc.stop(t0 + i * 0.4 + 0.32)
    }
    window.setTimeout(() => void ctx.close(), beeps * 400 + 500)
  } catch {
    // audio diblokir sebelum ada interaksi pengguna
  }
}

// --- Konteks: hanya pewawancara orang tua yang mengaktifkan timer -----------------------------------------------------

interface TimerContextValue {
  enabled: boolean
  userId: string
}

const TimerContext = createContext<TimerContextValue>({ enabled: false, userId: "" })

export function InterviewTimerProvider({
  enabled,
  userId,
  children,
}: TimerContextValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ enabled, userId }), [enabled, userId])
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

/** Waktu sekarang (ms) yang diperbarui tiap detik selama `active`; 0 saat render di server. */
export function useTick(active: boolean): number {
  return useSyncExternalStore(active ? subscribeTick : subscribeNever, getTickSnapshot, getTickServerSnapshot)
}

export function useInterviewTimer() {
  const { enabled, userId } = useContext(TimerContext)

  const raw = useSyncExternalStore(
    subscribeTimers,
    () => (enabled ? readRaw(userId) : EMPTY_RAW),
    () => EMPTY_RAW,
  )
  const entries = useMemo(() => parseEntries(raw), [raw])
  const ticking = enabled && entries.some((e) => e.startedAt !== null)
  const now = useTick(ticking)

  const start = useCallback((t: TimerTarget) => enabled && startTimer(userId, t), [enabled, userId])
  const pause = useCallback((id: string) => enabled && pauseTimer(userId, id), [enabled, userId])
  const resume = useCallback((id: string) => enabled && resumeTimer(userId, id), [enabled, userId])
  const restart = useCallback((id: string) => enabled && restartTimer(userId, id), [enabled, userId])
  const remove = useCallback((id: string) => enabled && removeTimer(userId, id), [enabled, userId])
  const ack = useCallback((id: string, level: 8 | 10) => enabled && ackTimer(userId, id, level), [enabled, userId])

  return { enabled, userId, entries, now, start, pause, resume, restart, remove, ack }
}

// --- Tampilan ---------------------------------------------------------------------------------------------------------

const PHASE_TEXT: Record<TimerPhase, string> = {
  normal: "text-emerald-700",
  warn: "text-amber-600",
  over: "text-rose-600",
}
const PHASE_PILL: Record<TimerPhase, string> = {
  normal: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  over: "bg-rose-50 text-rose-700 ring-rose-200",
}
const PHASE_BAR: Record<TimerPhase, string> = {
  normal: "bg-emerald-500",
  warn: "bg-amber-500",
  over: "bg-rose-500",
}

const ICON_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
const ACTION_BTN =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

/** Lencana kecil untuk baris daftar siswa. */
export function TimerBadge({ entry, now, className }: { entry: TimerEntry; now: number; className?: string }) {
  const remaining = entryRemainingSec(entry, now)
  const phase = timerPhase(remaining)
  const finished = entryFinished(entry, now)
  const paused = entry.startedAt === null && !finished
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset",
        PHASE_PILL[phase],
        className,
      )}
      title={finished ? "Timer berhenti otomatis (batas 10 menit)" : paused ? "Timer dijeda" : "Timer wawancara berjalan"}
    >
      <Timer size={12} aria-hidden="true" />
      {finished ? "Berhenti " : paused ? "Jeda " : ""}
      {formatRemaining(remaining)}
    </span>
  )
}

/** Kartu timer di halaman detail siswa. Tidak tampil untuk akun tanpa timer. */
export function StudentTimerCard({ candidateId, name, unit }: TimerTarget) {
  const { enabled, entries, now, start, pause, resume, restart, remove } = useInterviewTimer()
  if (!enabled) return null

  const entry = entries.find((e) => e.candidateId === candidateId)
  const remaining = entry ? entryRemainingSec(entry, now) : TIMER_DURATION_SEC
  const phase = timerPhase(remaining)
  const finished = !!entry && entryFinished(entry, now)
  const paused = !!entry && entry.startedAt === null && !finished
  const progress = entry ? Math.min(100, (entryElapsedMs(entry, now) / (TIMER_MAX_SEC * 1000)) * 100) : 0

  return (
    <section
      aria-label="Timer wawancara"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Timer size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Timer wawancara · 8 menit (maks. 10 menit)</p>
          <p role="timer" className={cn("text-3xl font-bold tabular-nums leading-tight", entry ? PHASE_TEXT[phase] : "text-slate-400")}>
            {formatRemaining(remaining)}
          </p>
          <p className="text-xs text-slate-500">
            {!entry
              ? "Belum dimulai. Timer otomatis mulai saat nama siswa diklik di daftar."
              : finished
                ? "Batas 10 menit tercapai, timer berhenti otomatis. Klik Mulai lagi untuk mengulang."
                : paused
                  ? "Dijeda"
                  : phase === "over"
                    ? "Waktu 8 menit terlampaui. Tambahan waktu sampai 10 menit, lalu timer berhenti otomatis."
                    : phase === "warn"
                      ? "Waktu hampir habis"
                      : "Berjalan"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          {!entry ? (
            <button type="button" onClick={() => start({ candidateId, name, unit })} className={ACTION_BTN}>
              <Play size={14} aria-hidden="true" />
              Mulai
            </button>
          ) : (
            <>
              {finished ? (
                <button type="button" onClick={() => restart(candidateId)} className={ACTION_BTN}>
                  <RotateCcw size={14} aria-hidden="true" />
                  Mulai lagi
                </button>
              ) : (
                <>
                  {paused ? (
                    <button type="button" onClick={() => resume(candidateId)} className={ACTION_BTN}>
                      <Play size={14} aria-hidden="true" />
                      Lanjut
                    </button>
                  ) : (
                    <button type="button" onClick={() => pause(candidateId)} className={ACTION_BTN}>
                      <Pause size={14} aria-hidden="true" />
                      Jeda
                    </button>
                  )}
                  <button type="button" onClick={() => restart(candidateId)} className={ACTION_BTN}>
                    <RotateCcw size={14} aria-hidden="true" />
                    Ulang
                  </button>
                </>
              )}
              <button type="button" onClick={() => remove(candidateId)} className={ACTION_BTN}>
                <CheckCheck size={14} aria-hidden="true" />
                Selesai
              </button>
            </>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:w-64" aria-hidden="true">
          <div className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", PHASE_BAR[phase])} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </section>
  )
}

/**
 * Pemberitahuan di layar pewawancara + panel pemantau melayang. Hanya informasi untuk pewawancara.
 * Dipasang sekali di layout agar tetap terlihat saat berpindah halaman.
 *
 * - Pemberitahuan muncul besar di atas layar (dengan bunyi/getar) saat 8 menit habis dan saat batas 10 menit tercapai,
 *   dan tetap tampil sampai pewawancara menekan "Mengerti".
 * - Timer yang mencapai 10 menit dihentikan otomatis; klik nama siswa lagi (atau "Mulai lagi") untuk memulai ulang.
 * - Panel melayang mendaftar semua timer; siswa yang sedang dibuka tidak ditampilkan (sudah punya kartu sendiri).
 * - Tidak tampil di halaman Al-Qur'an.
 */
export function InterviewTimerMonitor() {
  const { enabled, userId, entries, now, pause, resume, restart, remove, ack } = useInterviewTimer()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const onQuranPage = pathname.startsWith("/interviewer/quran")

  // Heartbeat ke server selama ada timer berjalan, supaya admin melihat status terbaru dan tahu jika sinyal terputus.
  const hasRunning = entries.some((e) => e.startedAt !== null)
  useEffect(() => {
    if (!enabled || !hasRunning) return
    const id = window.setInterval(() => void pushTimers(userId), SYNC_HEARTBEAT_MS)
    return () => window.clearInterval(id)
  }, [enabled, userId, hasRunning])

  // Bunyi sekali saat sebuah pemberitahuan baru muncul (bukan saat halaman dimuat ulang jauh setelah waktu habis),
  // dan hentikan timer yang sudah melewati batas 10 menit.
  const seenAlerts = useRef(new Set<string>())
  useEffect(() => {
    const current = new Set<string>()
    for (const e of entries) {
      const level = pendingAlert(e, now)
      if (level !== 0) {
        const key = `${e.candidateId}:${level}`
        current.add(key)
        const fresh = entryRawElapsedMs(e, now) - level * 60_000 < 5000
        if (!seenAlerts.current.has(key) && fresh && !onQuranPage) signalAlert(level === 10 ? 3 : 2)
      }
      if (e.startedAt !== null && entryFinished(e, now)) pause(e.candidateId)
    }
    seenAlerts.current = current
  }, [entries, now, pause, onQuranPage])

  if (!enabled || onQuranPage) return null

  const alerts = entries
    .map((e) => ({ e, level: pendingAlert(e, now) }))
    .filter((a) => a.level !== 0)
    .sort((a, b) => b.level - a.level)

  const visible = entries
    .filter((e) => !pathname.startsWith(`/interviewer/${e.candidateId}`))
    .sort((a, b) => entryRemainingSec(a, now) - entryRemainingSec(b, now))

  return (
    <>
      {alerts.length > 0 && (
        <div role="alert" aria-live="assertive" className="fixed inset-x-3 top-20 z-[60] mx-auto flex max-w-md flex-col gap-3">
          {alerts.map(({ e, level }) => {
            const stop = level === 10
            const toCap = Math.max(0, TIMER_MAX_SEC - Math.floor(entryElapsedMs(e, now) / 1000))
            return (
              <div
                key={`${e.candidateId}:${level}`}
                className={cn(
                  "rounded-2xl border-2 bg-white p-4 shadow-2xl",
                  stop ? "border-rose-400" : "border-amber-400",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      stop ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600",
                    )}
                  >
                    {stop ? <BellRing size={20} aria-hidden="true" /> : <AlarmClock size={20} aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900">{stop ? "Batas 10 menit tercapai" : "Waktu 8 menit habis"}</p>
                    <p className="truncate text-sm font-medium text-slate-700">{e.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {stop
                        ? "Timer berhenti otomatis. Klik Mulai lagi jika wawancara dilanjutkan."
                        : `Tambahan waktu sampai 10 menit. Timer berhenti otomatis dalam ${formatRemaining(toCap)}.`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {stop && (
                    <button type="button" onClick={() => restart(e.candidateId)} className={ACTION_BTN}>
                      <RotateCcw size={14} aria-hidden="true" />
                      Mulai lagi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => ack(e.candidateId, level === 10 ? 10 : 8)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  >
                    Mengerti
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {visible.length > 0 && (
        <aside
          aria-label="Pemantau timer wawancara"
          className="fixed bottom-3 right-3 z-40 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
        >
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            className="flex w-full items-center gap-2 bg-[#0D1B2A] px-3.5 py-2.5 text-left text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
          >
            <Timer size={15} aria-hidden="true" />
            <span className="flex-1 text-sm font-semibold">Timer wawancara ({visible.length})</span>
            {collapsed ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>

          {!collapsed && (
            <>
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                {visible.map((e) => {
                  const remaining = entryRemainingSec(e, now)
                  const phase = timerPhase(remaining)
                  const finished = entryFinished(e, now)
                  const paused = e.startedAt === null && !finished
                  return (
                    <li key={e.candidateId} className="flex items-center gap-2 px-3 py-2">
                      <Link
                        href={`/interviewer/${e.candidateId}?unit=${e.unit}`}
                        className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                      >
                        <span className="block truncate text-sm font-medium text-slate-900">{e.name}</span>
                        <span className={cn("text-xs font-semibold tabular-nums", PHASE_TEXT[phase])}>
                          {finished ? "Berhenti (batas 10 menit) · " : paused ? "Jeda · " : phase === "over" ? "Lewat waktu · " : ""}
                          {formatRemaining(remaining)}
                        </span>
                      </Link>
                      {finished ? (
                        <button type="button" onClick={() => restart(e.candidateId)} aria-label={`Mulai ulang timer ${e.name}`} className={ICON_BTN}>
                          <RotateCcw size={14} aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => (paused ? resume(e.candidateId) : pause(e.candidateId))}
                          aria-label={paused ? `Lanjutkan timer ${e.name}` : `Jeda timer ${e.name}`}
                          className={ICON_BTN}
                        >
                          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                        </button>
                      )}
                      <button type="button" onClick={() => remove(e.candidateId)} aria-label={`Hapus timer ${e.name}`} className={ICON_BTN}>
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
                Hanya informasi untuk pewawancara. Tidak membatasi pengisian.
              </p>
            </>
          )}
        </aside>
      )}
    </>
  )
}
