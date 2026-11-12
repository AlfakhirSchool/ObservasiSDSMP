import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BrandLogo } from "@/components/layout/brand-logo"
import { LogoutButton } from "@/components/layout/logout-button"
import { UserChip } from "@/components/layout/user-chip"
import { Table2, Home } from "lucide-react"

export default async function InterviewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const isAdmin = session.user?.role?.startsWith("admin")

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Dedicated Top Nav for Interviewers */}
      <nav className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[#0D1B2A] text-white">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/interviewer"
            className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <BrandLogo role="interviewer" />
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                aria-label="Dashboard Admin"
                title="Kembali ke Dashboard Administrator"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600/90 px-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:px-3"
              >
                <Home size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Dashboard Admin</span>
              </Link>
            )}

            {/* Pilihan Jenjang Koreksi Pewawancara: SD dan SMP terpisah */}
            <div
              role="group"
              aria-label="Pilihan Jenjang Koreksi"
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
            >
              <Link
                href="/interviewer/sd"
                title="Koreksi Observasi Calon Siswa SD"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-orange-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span className="h-2 w-2 rounded-full bg-orange-400" aria-hidden="true" />
                <span>Koreksi SD</span>
              </Link>
              <Link
                href="/interviewer/smp"
                title="Koreksi Wawancara Calon Siswa SMP"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                <span>Koreksi SMP</span>
              </Link>
            </div>

            <Link
              href="/interviewer"
              aria-label="Rekap hasil"
              title="Rekap semua hasil observasi"
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 sm:px-3"
            >
              <Table2 size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Rekap</span>
            </Link>
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <UserChip
              name={session.user?.name}
              role={session.user?.role}
              className="hidden sm:flex"
            />
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <LogoutButton className="px-2.5 sm:px-3 [&>span]:hidden sm:[&>span]:inline" />
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  )
}
