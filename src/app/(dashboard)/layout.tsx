import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { GraduationCap, LayoutDashboard, Users, HelpCircle, Archive } from "lucide-react"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/layout/brand-logo"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const role = session.user?.role as any
  if (!role || role === "unauthorized") redirect("/login?error=unauthorized")

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* GLOBAL PORTAL TOP NAV */}
      <nav className="h-[75px] bg-[#0D1B2A] text-white flex items-center justify-between px-8 sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-8">
          <Link href="/admin/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <BrandLogo role={role} />
          </Link>

          {/* Horizontal Menu */}
          <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-2xl">
            <Link href="/admin/admin" className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition-all text-[12px] font-bold uppercase tracking-tight text-slate-300 hover:text-white">
              <LayoutDashboard size={14} /> Ringkasan
            </Link>
            <Link href="/admin/candidates" className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition-all text-[12px] font-bold uppercase tracking-tight text-slate-300 hover:text-white">
              <Users size={14} /> Siswa
            </Link>
            <Link href="/admin/questions" className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition-all text-[12px] font-bold uppercase tracking-tight text-slate-300 hover:text-white">
              <HelpCircle size={14} /> Observasi
            </Link>
            <Link href="/admin/academic" className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition-all text-[12px] font-bold uppercase tracking-tight text-slate-300 hover:text-white">
              <GraduationCap size={14} /> Akademik
            </Link>
            <div className="w-px h-4 bg-white/10 mx-2" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mr-2 italic">Pewawancara:</span>
              <Link href="/interviewer/sd" className="px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-all text-[11px] font-bold uppercase tracking-tight text-emerald-400">SD</Link>
              <Link href="/interviewer/smp" className="px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-all text-[11px] font-bold uppercase tracking-tight text-emerald-400">SMP</Link>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Header session={session} isPortal />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {children}
      </main>
    </div>
  )
}
