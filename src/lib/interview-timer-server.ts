import { prisma } from "@/lib/prisma"
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
  const rows = await prisma.interviewTimer.findMany({
    where: { updatedAt: { gte: new Date(now - ADMIN_VISIBLE_MS) }, ...(level ? { level } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 200,
  })
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
