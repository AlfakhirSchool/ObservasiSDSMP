/**
 * Timer wawancara orang tua: 8 menit, dengan tambahan waktu sampai batas 10 menit.
 * Setelah 10 menit timer berhenti otomatis (angka berhenti di +02:00); klik nama siswa lagi untuk memulai ulang.
 *
 * Hanya informasi untuk pewawancara: tidak mengunci form dan tidak disimpan ke database.
 * Status disimpan di localStorage per akun sehingga tetap berjalan saat pindah halaman atau memuat ulang.
 * Waktu dihitung dari Date.now(), bukan dari hitungan interval, sehingga tetap akurat walau tab dibuat idle oleh browser.
 */

export const TIMER_DURATION_SEC = 8 * 60
/** Batas keras: timer berhenti otomatis di sini. */
export const TIMER_MAX_SEC = 10 * 60
/** Sisa waktu (detik) saat tampilan berubah menjadi kuning. */
export const TIMER_WARN_SEC = 2 * 60

/**
 * Pewawancara orang tua yang memakai timer, dikenali dari username akun (nama tampilan bisa berubah/berbeda ejaan):
 * Mr. Deny Rahmat, Mrs. Aini Febiyanti, Mrs. Anggraini, Mrs. Arifah Hilyati, Mrs. Siti Rokoyah,
 * Mrs. Wulan Apringtyas, Mrs. Lu'lu' Luthfiyah.
 * Pewawancara Al-Qur'an (Faisal, Dedi, Fida, Malik, Inggrid, Rhoyan, Nazly, Irfan) sengaja tidak disertakan.
 */
export const TIMER_USERNAMES: readonly string[] = ["deny", "aini", "anggraini", "arifah", "siti", "wulan", "lulu", "tes"]

export function hasInterviewTimer(username: string | null | undefined): boolean {
  return !!username && TIMER_USERNAMES.includes(username.trim().toLowerCase())
}

export type TimerUnit = "SD" | "SMP"

export interface TimerEntry {
  candidateId: string
  name: string
  unit: TimerUnit
  /** Waktu mulai segmen berjalan (ms epoch); null saat dijeda. */
  startedAt: number | null
  /** Akumulasi waktu berjalan dari segmen sebelumnya (ms). */
  elapsedMs: number
  /** Dipakai membuang entri basi. */
  updatedAt: number
  /** Pemberitahuan tertinggi yang sudah ditutup pewawancara: 0 (belum), 8, atau 10 (menit). */
  ack: number
}

export type TimerPhase = "normal" | "warn" | "over"

/** Waktu berjalan tanpa batas atas (dipakai untuk mendeteksi saat batas 10 menit baru saja tercapai). */
export function entryRawElapsedMs(e: TimerEntry, now: number): number {
  return e.elapsedMs + (e.startedAt === null ? 0 : Math.max(0, now - e.startedAt))
}

/** Waktu berjalan, berhenti di batas 10 menit. */
export function entryElapsedMs(e: TimerEntry, now: number): number {
  return Math.min(entryRawElapsedMs(e, now), TIMER_MAX_SEC * 1000)
}

/** Sudah mencapai batas 10 menit → timer berhenti otomatis. */
export function entryFinished(e: TimerEntry, now: number): boolean {
  return entryRawElapsedMs(e, now) >= TIMER_MAX_SEC * 1000
}

export type TimerAlertLevel = 0 | 8 | 10

/**
 * Pemberitahuan yang harus tampil di layar pewawancara: 8 = waktu 8 menit habis (tambahan sampai 10 menit),
 * 10 = batas 10 menit tercapai dan timer berhenti. 0 = tidak ada. Hilang setelah ditutup (ack).
 */
export function pendingAlert(e: TimerEntry, now: number): TimerAlertLevel {
  const raw = entryRawElapsedMs(e, now)
  if (raw >= TIMER_MAX_SEC * 1000) return e.ack < 10 ? 10 : 0
  if (raw >= TIMER_DURATION_SEC * 1000) return e.ack < 8 ? 8 : 0
  return 0
}

/** Sisa detik; negatif jika waktu sudah lewat. */
export function entryRemainingSec(e: TimerEntry, now: number): number {
  return Math.ceil((TIMER_DURATION_SEC * 1000 - entryElapsedMs(e, now)) / 1000)
}

export function timerPhase(remainingSec: number): TimerPhase {
  if (remainingSec < 0) return "over"
  return remainingSec <= TIMER_WARN_SEC ? "warn" : "normal"
}

/** 07:42 untuk sisa waktu, +01:05 untuk kelebihan waktu. */
export function formatRemaining(remainingSec: number): string {
  const abs = Math.abs(remainingSec)
  const mm = String(Math.floor(abs / 60)).padStart(2, "0")
  const ss = String(abs % 60).padStart(2, "0")
  return `${remainingSec < 0 ? "+" : ""}${mm}:${ss}`
}

// ---------------------------------------------------------------------------------------------------------------------
// Penyimpanan (localStorage, per akun). Semua fungsi aman dipanggil di server: tanpa window → tidak melakukan apa-apa.
// ---------------------------------------------------------------------------------------------------------------------

const KEY_PREFIX = "alfakhir_interview_timers:"
const CHANGE_EVENT = "alfakhir:interview-timers"
/** Sama dengan umur sesi login (12 jam); entri lebih tua dibuang saat menulis. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

const storageKey = (userId: string) => `${KEY_PREFIX}${userId}`

export const EMPTY_RAW = "[]"

export function readRaw(userId: string): string {
  try {
    return window.localStorage.getItem(storageKey(userId)) ?? EMPTY_RAW
  } catch {
    return EMPTY_RAW
  }
}

function parseEntry(v: unknown): TimerEntry | null {
  if (typeof v !== "object" || v === null) return null
  const o = v as Record<string, unknown>
  if (
    typeof o.candidateId !== "string" ||
    typeof o.name !== "string" ||
    (o.unit !== "SD" && o.unit !== "SMP") ||
    (o.startedAt !== null && typeof o.startedAt !== "number") ||
    typeof o.elapsedMs !== "number" ||
    typeof o.updatedAt !== "number"
  ) {
    return null
  }
  return {
    candidateId: o.candidateId,
    name: o.name,
    unit: o.unit,
    startedAt: o.startedAt,
    elapsedMs: o.elapsedMs,
    updatedAt: o.updatedAt,
    ack: typeof o.ack === "number" ? o.ack : 0,
  }
}

export function parseEntries(raw: string): TimerEntry[] {
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.flatMap((v) => {
      const e = parseEntry(v)
      return e ? [e] : []
    })
  } catch {
    return []
  }
}

export function subscribeTimers(callback: () => void): () => void {
  window.addEventListener("storage", callback)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

function mutate(userId: string, fn: (entries: TimerEntry[], now: number) => TimerEntry[]): void {
  const now = Date.now()
  const next = fn(parseEntries(readRaw(userId)), now).filter((e) => now - e.updatedAt < MAX_AGE_MS)
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next))
  } catch {
    return // penyimpanan penuh/diblokir: timer tidak kritis, abaikan
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
  scheduleSync(userId)
}

// ---------------------------------------------------------------------------------------------------------------------
// Sinkron ke server (agar admin bisa memantau). Timer lokal adalah sumber kebenaran: jika sinkron gagal (offline,
// server error, akun tanpa izin), timer pewawancara tetap berjalan normal dan tidak ada pesan galat yang ditampilkan.
// Yang dikirim selalu seluruh status (idempoten), jadi sinkron yang terlewat otomatis terkoreksi pada pengiriman berikutnya.
// ---------------------------------------------------------------------------------------------------------------------

const SYNC_DEBOUNCE_MS = 300
/** Selama ada timer berjalan, status dikirim ulang berkala; admin menandai "tanpa sinyal" jika lebih lama dari ini. */
export const SYNC_HEARTBEAT_MS = 30_000
let syncHandle: number | undefined

function scheduleSync(userId: string): void {
  window.clearTimeout(syncHandle)
  syncHandle = window.setTimeout(() => void pushTimers(userId), SYNC_DEBOUNCE_MS)
}

export async function pushTimers(userId: string): Promise<void> {
  const now = Date.now()
  const entries = parseEntries(readRaw(userId)).map((e) => ({
    candidateId: e.candidateId,
    running: e.startedAt !== null && !entryFinished(e, now),
    elapsedMs: Math.round(entryElapsedMs(e, now)),
  }))
  try {
    await fetch("/api/interview-timer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
      keepalive: true,
    })
  } catch {
    // offline / gagal: abaikan, dicoba lagi pada heartbeat atau perubahan berikutnya
  }
}

export interface TimerTarget {
  candidateId: string
  name: string
  unit: TimerUnit
}

/**
 * Mulai timer 8 menit untuk siswa. Jika timer siswa itu masih berjalan/dijeda, tidak diulang dari awal.
 * Jika sudah berhenti di batas 10 menit, klik berikutnya memulai ulang dari 08:00.
 */
export function startTimer(userId: string, target: TimerTarget): void {
  mutate(userId, (entries, now) => {
    const existing = entries.find((e) => e.candidateId === target.candidateId)
    if (!existing) return [...entries, { ...target, startedAt: now, elapsedMs: 0, updatedAt: now, ack: 0 }]
    if (!entryFinished(existing, now)) return entries
    return entries.map((e) => (e === existing ? { ...e, startedAt: now, elapsedMs: 0, updatedAt: now, ack: 0 } : e))
  })
}

export function pauseTimer(userId: string, candidateId: string): void {
  mutate(userId, (entries, now) =>
    entries.map((e) =>
      e.candidateId === candidateId && e.startedAt !== null
        ? { ...e, elapsedMs: entryElapsedMs(e, now), startedAt: null, updatedAt: now }
        : e,
    ),
  )
}

export function resumeTimer(userId: string, candidateId: string): void {
  mutate(userId, (entries, now) =>
    entries.map((e) => (e.candidateId === candidateId && e.startedAt === null ? { ...e, startedAt: now, updatedAt: now } : e)),
  )
}

/** Ulang dari 08:00 dan langsung berjalan. */
export function restartTimer(userId: string, candidateId: string): void {
  mutate(userId, (entries, now) =>
    entries.map((e) => (e.candidateId === candidateId ? { ...e, startedAt: now, elapsedMs: 0, updatedAt: now, ack: 0 } : e)),
  )
}

export function removeTimer(userId: string, candidateId: string): void {
  mutate(userId, (entries) => entries.filter((e) => e.candidateId !== candidateId))
}

/** Pewawancara menutup pemberitahuan (tingkat 8 atau 10) untuk siswa ini. */
export function ackTimer(userId: string, candidateId: string, level: 8 | 10): void {
  mutate(userId, (entries) => entries.map((e) => (e.candidateId === candidateId ? { ...e, ack: Math.max(e.ack, level) } : e)))
}
