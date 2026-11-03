import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BrandLogo } from "@/components/layout/brand-logo"
import { LogoutButton } from "@/components/layout/logout-button"
import { UserChip } from "@/components/layout/user-chip"

export default async function InterviewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

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

          <div className="flex items-center gap-3">
            <UserChip
              name={session.user?.name}
              role={session.user?.role}
              className="hidden sm:flex"
            />
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  )
}
