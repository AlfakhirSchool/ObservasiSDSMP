import { GraduationCap, HelpCircle, History, LayoutDashboard, UserCog, Users, type LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Siswa", icon: Users },
  { href: "/admin/questions", label: "Observasi", icon: HelpCircle },
  { href: "/admin/academic", label: "Akademik", icon: GraduationCap },
  { href: "/admin/users", label: "Pengguna", icon: UserCog },
  { href: "/admin/activity", label: "Riwayat", icon: History },
]

export const INTERVIEWER_NAV_ITEMS: { href: string; label: string; dot: string }[] = [
  { href: "/interviewer/sd", label: "SD", dot: "bg-orange-400" },
  { href: "/interviewer/smp", label: "SMP", dot: "bg-emerald-400" },
]
