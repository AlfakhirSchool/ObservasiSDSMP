import { Activity, BookOpen, GraduationCap, HelpCircle, History, LayoutDashboard, Table2, Timer, UserCog, Users, type LucideIcon } from "lucide-react"
import type { UserRole } from "@/components/layout/user-display"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Siswa", icon: Users },
  { href: "/admin/questions", label: "Observasi", icon: HelpCircle },
  { href: "/interviewer/quran", label: "Al-Qur'an", icon: BookOpen },
  { href: "/admin/academic", label: "Akademik", icon: GraduationCap },
  { href: "/admin/users", label: "Pengguna", icon: UserCog },
  { href: "/admin/rekap", label: "Rekap", icon: Table2 },
  { href: "/admin/timer", label: "Timer", icon: Timer },
  { href: "/admin/activity", label: "Riwayat", icon: History },
]

/** Panitia: hanya halaman lihat-saja. */
const COMMITTEE_NAV_ITEMS: NavItem[] = [
  { href: "/admin/candidates", label: "Siswa", icon: Users },
  { href: "/admin/rekap", label: "Rekap", icon: Table2 },
  { href: "/admin/interviewers", label: "Monitor Pewawancara", icon: Activity },
  { href: "/admin/timer", label: "Timer", icon: Timer },
]

export const mainNavFor = (role: UserRole): NavItem[] => (role === "committee" ? COMMITTEE_NAV_ITEMS : MAIN_NAV_ITEMS)

/** Grup menu Pewawancara (SD/SMP/Al-Qur'an) tidak ditampilkan untuk panitia. */
export const showsInterviewerNav = (role: UserRole): boolean => role !== "committee"

export const INTERVIEWER_NAV_ITEMS: { href: string; label: string; dot: string }[] = [
  { href: "/interviewer/sd", label: "Koreksi SD", dot: "bg-orange-400" },
  { href: "/interviewer/quran?unit=SD", label: "Al-Qur'an SD", dot: "bg-orange-300" },
  { href: "/interviewer/smp", label: "Koreksi SMP", dot: "bg-emerald-400" },
  { href: "/interviewer/quran?unit=SMP", label: "Al-Qur'an SMP", dot: "bg-emerald-300" },
]
