import { BookOpen, GraduationCap, HelpCircle, History, LayoutDashboard, Table2, Timer, UserCog, Users, type LucideIcon } from "lucide-react"

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

export const INTERVIEWER_NAV_ITEMS: { href: string; label: string; dot: string }[] = [
  { href: "/interviewer/sd", label: "Koreksi SD", dot: "bg-orange-400" },
  { href: "/interviewer/quran?unit=SD", label: "Al-Qur'an SD", dot: "bg-orange-300" },
  { href: "/interviewer/smp", label: "Koreksi SMP", dot: "bg-emerald-400" },
  { href: "/interviewer/quran?unit=SMP", label: "Al-Qur'an SMP", dot: "bg-emerald-300" },
]
