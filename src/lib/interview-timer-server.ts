import { prisma } from "@/lib/prisma"
import { TIMER_DURATION_SEC, TIMER_MAX_SEC, TIMER_USERNAMES } from "@/lib/interview-timer"
import type { Level } from "@prisma/client"

/** Baris basi (pewawancara menutup browser lalu tidak kembali) disembunyikan dari admin setelah ini. */
export const ADMIN_VISIBLE_MS = 3 * 60 * 60 * 1000
/** Baris yang lebih tua dari ini dibuang saat ada sinkron berikutnya (sama dengan umur sesi login). */
export const PURGE_AFTER_MS = 12 * 60 * 60 * 1000

export interface AdminTimerRow {
  interviewerName: string
  candidateId: string
  candidateName: string
  level: Level
  /** Awal segmen berjalan (ms epoch, jam server); null = dijeda/berhenti. */
  startedAt: number | null
  /** Waktu berjalan sampai startedAt (atau total saat dijeda), ms. */
  elapsedMs: number
  /** Sinyal terakhir dari browser pewawancara (ms epoch, jam server). */
  updatedAt: number
}

export interface AdminTimerPayload {
  /** Jam server saat data dibaca; dipakai klien untuk mengoreksi selisih jam. */
  serverNow: number
  rows: AdminTimerRow[]
}

/** Timer wawancara yang sedang/baru berjalan, untuk pemantauan admin. `level` membatasi ke satu unit (admin SD/SMP). */
export async function getAdminTimers(level?: Level): Promise<AdminTimerPayload> {
  const now = Date.now()
  const found = await prisma.interviewTimer.findMany({
    where: { updatedAt: { gte: new Date(now - ADMIN_VISIBLE_MS) }, ...(level ? { level } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 200,
  })
  // Siswa yang catatannya sudah dikunci dianggap selesai dan tidak ditampilkan (termasuk baris lama yang tersisa).
  const done = new Set(
    (
      await prisma.interviewerNote.findMany({
        where: { candidateId: { in: found.map((r) => r.candidateId) }, isLocked: true },
        select: { candidateId: true },
      })
    ).map((n) => n.candidateId),
  )
  const rows = found.filter((r) => !done.has(r.candidateId))
  return {
    serverNow: now,
    rows: rows.map((r) => ({
      interviewerName: r.interviewerName,
      candidateId: r.candidateId,
      candidateName: r.candidateName,
      level: r.level,
      startedAt: r.startedAt ? r.startedAt.getTime() : null,
      elapsedMs: r.elapsedMs,
      updatedAt: r.updatedAt.getTime(),
    })),
  }
}

/** Lama wawancara (detik, maks. 10 menit) dari baris timer di server, dihitung dengan jam server. */
export function interviewSecondsFromRow(row: { startedAt: Date | null; elapsedMs: number }, nowMs: number): number {
  const running = row.startedAt ? Math.max(0, nowMs - row.startedAt.getTime()) : 0
  return Math.min(Math.round((row.elapsedMs + running) / 1000), TIMER_MAX_SEC)
}

// --- Rekap wawancara yang sudah selesai disimpan ------------------------------------------------------------------------

export type SummaryScope = "today" | "all"

export interface InterviewerSummary {
  name: string
  /** Jumlah catatan yang sudah dikirim dan dikunci. */
  done: number
  /** Dari `done`, berapa yang punya data durasi (catatan lama sebelum fitur timer tidak punya). */
  timed: number
  avgSeconds: number | null
  /** Durasi lebih dari 8 menit. */
  over8: number
  /** Mencapai batas 10 menit. */
  atCap: number
}

export interface FinishedRow {
  interviewerName: string
  candidateId: string
  candidateName: string
  level: Level
  /** Waktu catatan dikunci (ms epoch). */
  savedAt: number
  seconds: number | null
}

export interface TimerSummaryPayload {
  scope: SummaryScope
  serverNow: number
  perInterviewer: InterviewerSummary[]
  totals: Omit<InterviewerSummary, "name">
  recent: FinishedRow[]
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
/** Awal hari ini di WIB (ms epoch), sekolah beroperasi di zona waktu WIB. */
function startOfTodayWib(nowMs: number): number {
  return Math.floor((nowMs + WIB_OFFSET_MS) / DAY_MS) * DAY_MS - WIB_OFFSET_MS
}

function summarize(seconds: (number | null)[]): Omit<InterviewerSummary, "name"> {
  const timed = seconds.filter((s): s is number => s !== null)
  return {
    done: seconds.length,
    timed: timed.length,
    avgSeconds: timed.length > 0 ? Math.round(timed.reduce((a, b) => a + b, 0) / timed.length) : null,
    over8: timed.filter((s) => s > TIMER_DURATION_SEC).length,
    atCap: timed.filter((s) => s >= TIMER_MAX_SEC).length,
  }
}

/**
 * Rekap wawancara yang sudah selesai disimpan (catatan terkunci) untuk pewawancara pemakai timer.
 * `scope` = hari ini (WIB) atau semua; `level` membatasi ke satu unit (admin SD/SMP).
 */
export async function getTimerSummary(scope: SummaryScope, level?: Level): Promise<TimerSummaryPayload> {
  const now = Date.now()
  const roster = await prisma.user.findMany({
    where: { username: { in: [...TIMER_USERNAMES] } },
    select: { name: true, username: true },
  })
  const names = roster.map((u) => u.name ?? u.username ?? "").filter((n) => n !== "")

  const notes = await prisma.interviewerNote.findMany({
    where: {
      isLocked: true,
      interviewerName: { in: names },
      ...(scope === "today" ? { updatedAt: { gte: new Date(startOfTodayWib(now)) } } : {}),
      ...(level ? { candidate: { level } } : {}),
    },
    select: {
      candidateId: true,
      interviewerName: true,
      interviewSeconds: true,
      updatedAt: true,
      candidate: { select: { name: true, correctedName: true, level: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const perInterviewer = names
    .map((name) => ({ name, ...summarize(notes.filter((n) => n.interviewerName === name).map((n) => n.interviewSeconds)) }))
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name))

  return {
    scope,
    serverNow: now,
    perInterviewer,
    totals: summarize(notes.map((n) => n.interviewSeconds)),
    recent: notes.slice(0, 15).map((n) => ({
      interviewerName: n.interviewerName,
      candidateId: n.candidateId,
      candidateName: n.candidate.correctedName || n.candidate.name,
      level: n.candidate.level,
      savedAt: n.updatedAt.getTime(),
      seconds: n.interviewSeconds,
    })),
  }
}
