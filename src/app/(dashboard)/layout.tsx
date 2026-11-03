import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { BrandLogo } from "@/components/layout/brand-logo"
import { NavLink } from "@/components/layout/nav-link"
import { MobileNav } from "@/components/layout/mobile-nav"
import { INTERVIEWER_NAV_ITEMS, MAIN_NAV_ITEMS } from "@/components/layout/nav-items"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const role = session.user?.role
  if (!role || role === "unauthorized") redirect("/login?error=unauthorized")

  const name = session.user?.name

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* GLOBAL PORTAL TOP NAV */}
      <nav className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[#0D1B2A] text-white">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 xl:gap-5">
            <MobileNav name={name} role={role} />

            <Link
              href="/admin/admin"
              className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <BrandLogo role={role} />
            </Link>

            {/* Horizontal Menu */}
            <div className="hidden items-center gap-1 xl:flex">
              {MAIN_NAV_ITEMS.map(({ href, label }) => (
                <NavLink key={href} href={href}>
                  {label}
                </NavLink>
              ))}

              <div className="mx-3 h-6 w-px bg-white/10" aria-hidden="true" />

              <div
                role="group"
                aria-label="Pewawancara"
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
              >
                {INTERVIEWER_NAV_ITEMS.map(({ href, label, dot }) => (
                  <NavLink key={href} href={href} className="px-2.5 py-1 text-xs">
                    <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" /> {label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          <Header name={name} role={role} />
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  )
}
