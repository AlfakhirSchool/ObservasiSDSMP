import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BrandLogo } from "@/components/layout/brand-logo"
import { LogoutButton } from "@/components/layout/logout-button"
import { UserChip } from "@/components/layout/user-chip"
import { Home } from "lucide-react"
import { InterviewerNav } from "@/components/layout/interviewer-nav"

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
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0D1B2A] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:h-16 lg:flex-nowrap lg:justify-between lg:gap-4 lg:px-8 lg:py-0">
          <Link
            href="/interviewer"
            className="order-1 flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <BrandLogo role="interviewer" />
          </Link>

          {/* Menu unit: baris kedua yang bisa digeser di HP, sebaris di desktop */}
          <div className="order-3 w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden empty:hidden lg:order-2 lg:flex lg:w-auto lg:flex-1 lg:justify-end lg:overflow-visible">
            <InterviewerNav />
          </div>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:order-3 lg:ml-0">
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
