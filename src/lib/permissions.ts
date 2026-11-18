import type { AppRole } from "@/types/next-auth"
import { isQuranObserver, QURAN_HOME } from "@/lib/quran-observer"

type MaybeRole = AppRole | null | undefined

export const isAdminRole = (role: MaybeRole): boolean => !!role && role.startsWith("admin")

export const isCommittee = (role: MaybeRole): boolean => role === "committee"

/** Admin atau panitia: boleh membaca data pemantauan (statistik, timer, daftar siswa). Menulis tetap hanya admin. */
export const canViewMonitoring = (role: MaybeRole): boolean => isAdminRole(role) || isCommittee(role)

/** Pewawancara/observasi atau admin: boleh membuka halaman /interviewer. Panitia tidak. */
export const canOpenInterviewerArea = (role: MaybeRole): boolean =>
  role === "interviewer" || role === "quran_observer" || isAdminRole(role)

/** Isi/simpan nilai Al-Qur'an. Pewawancara biasa tidak. */
export const canFillQuran = (role: MaybeRole, username?: string | null): boolean =>
  role === "quran_observer" || isQuranObserver(username) || isAdminRole(role)

/** Tulis catatan observasi, ringkasan AI, raport SD. Observasi Al-Qur'an dan panitia hanya lihat. */
export const canWriteObservation = (role: MaybeRole, username?: string | null): boolean => {
  if (role === "quran_observer" || isQuranObserver(username) || role === "committee") return false
  return role === "interviewer" || isAdminRole(role)
}

/** Halaman admin yang boleh dibuka panitia (hanya lihat). */
const COMMITTEE_PAGES = ["/admin/candidates", "/admin/rekap", "/admin/interviewers", "/admin/timer"] as const

/** API baca yang dibutuhkan halaman panitia. */
const COMMITTEE_READ_APIS = [
  "/api/admin/stats",
  "/api/admin/interview-timers",
  "/api/admin/interview-timers/summary",
  "/api/candidates",
  "/api/notifications",
  "/api/academic/rekap",
] as const

const underAny = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

export const committeeMayOpen = (pathname: string, method: string): boolean =>
  pathname.startsWith("/api/")
    ? method === "GET" && underAny(pathname, COMMITTEE_READ_APIS)
    : underAny(pathname, COMMITTEE_PAGES)

/** Halaman awal tiap peran setelah login. */
export const homePathFor = (role: MaybeRole, username?: string | null): string => {
  if (isAdminRole(role)) return "/admin"
  if (role === "committee") return "/admin/rekap"
  if (role === "quran_observer" || isQuranObserver(username)) return QURAN_HOME
  return "/interviewer"
}
