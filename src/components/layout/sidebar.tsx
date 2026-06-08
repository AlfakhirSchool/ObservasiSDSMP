
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  HelpCircle,
  Monitor,
  Archive,
  LogOut,
  LayoutGrid,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { BrandLogo } from "./brand-logo"

interface SidebarProps {
  role: "admin" | "admin_sd" | "admin_smp" | "interviewer"
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const getSections = () => {
    const sections = []

    if (role === "admin") {
      sections.push(
        {
          title: "PUSAT",
          links: [
            { href: "/admin/admin", label: "Dashboard Utama", icon: LayoutDashboard },
            { href: "/admin/candidates", label: "Seluruh Kandidat", icon: Users },
            { href: "/admin/questions", label: "Manajemen Soal", icon: HelpCircle },
          ],
        },
        {
          title: "SISTEM",
          links: [
            { href: "/interviewer", label: "Portal Pewawancara", icon: LayoutGrid },
            { href: "/admin/interviewers", label: "Monitor Tim", icon: Users },
            { href: "/admin/archive", label: "Arsip Catatan", icon: Archive },
          ],
        }
      )
    }

    if (role === "admin_sd") {
      sections.push({
        title: "DASHBOARD SD",
        links: [
          { href: "/sd", label: "Ringkasan SD", icon: LayoutDashboard },
          { href: "/admin/sd/candidates", label: "Kandidat SD", icon: Users },
          { href: "/admin/questions", label: "Daftar Soal", icon: HelpCircle },
        ],
      })
    }

    if (role === "admin_smp") {
      sections.push({
        title: "DASHBOARD SMP",
        links: [
          { href: "/smp", label: "Ringkasan SMP", icon: LayoutDashboard },
          { href: "/admin/smp/candidates", label: "Kandidat SMP", icon: Users },
          { href: "/admin/questions", label: "Daftar Soal", icon: HelpCircle },
        ],
      })
    }

    if (role === "interviewer") {
      sections.push({
        title: "PEWAWANCARA",
        links: [
          { href: "/interviewer", label: "Dashboard", icon: LayoutDashboard },
        ],
      })
    }

    return sections
  }

  const sections = getSections()

  return (
    <aside className="w-[220px] h-screen bg-[#0D1B2A] fixed left-0 top-0 bottom-0 flex flex-col z-50 overflow-y-auto custom-scrollbar border-r border-white/5">
      <div className="p-6 border-b border-white/5">
        <Link href="/admin/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <BrandLogo role={role} />
        </Link>
      </div>

      {/* NAV SECTIONS */}
      <nav className="flex-1 px-3 py-6">
        {sections.map((section) => (
          <div key={section.title} className="mb-6 last:mb-0">
            <div className="px-3 mb-2.5 text-[10px] font-black text-[#475569] uppercase tracking-[0.15em] opacity-80">
              {section.title}
            </div>
            <div className="space-y-[3px]">
              {section.links.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all group",
                      isActive
                        ? "bg-[#1E3A5F] text-white shadow-sm"
                        : "text-[#94A3B8] hover:bg-[#1E3A5F]/50 hover:text-white"
                    )}
                  >
                    <link.icon className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isActive ? "text-primary" : "text-[#475569] group-hover:text-[#94A3B8]"
                    )} />
                    <span className="truncate tracking-wide">{link.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  )
}
