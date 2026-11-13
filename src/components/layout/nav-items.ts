import { BookOpen, GraduationCap, HelpCircle, History, LayoutDashboard, Table2, UserCog, Users, type LucideIcon } from "lucide-react"

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
  { href: "/admin/activity", label: "Riwayat", icon: History },
]

export const INTERVIEWER_NAV_ITEMS: { href: string; label: string; dot: string }[] = [
  { href: "/interviewer/sd", label: "SD", dot: "bg-orange-400" },
  { href: "/interviewer/smp", label: "SMP", dot: "bg-emerald-400" },
  { href: "/interviewer/quran", label: "Al-Qur'an", dot: "bg-sky-400" },
]
