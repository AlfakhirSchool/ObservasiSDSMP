"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { NavLink } from "@/components/layout/nav-link"
import { LogoutButton } from "@/components/layout/logout-button"
import { UserChip } from "@/components/layout/user-chip"
import { INTERVIEWER_NAV_ITEMS, MAIN_NAV_ITEMS } from "@/components/layout/nav-items"
import type { UserRole } from "@/components/layout/user-display"

interface MobileNavProps {
  name: string | null | undefined
  role: UserRole
}

export function MobileNav({ name, role }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        title={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-panel"
            className="absolute inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-white/10 bg-[#0D1B2A] px-4 py-4 shadow-lg"
          >
            <nav aria-label="Menu utama" className="flex flex-col gap-1">
              {MAIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <NavLink key={href} href={href} className="py-2.5">
                  <Icon size={16} aria-hidden="true" /> {label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="px-3 pb-2 text-xs font-medium text-slate-400">Pewawancara</p>
              <div className="flex flex-col gap-1">
                {INTERVIEWER_NAV_ITEMS.map(({ href, label, dot }) => (
                  <NavLink key={href} href={href} className="py-2.5">
                    <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" /> Unit {label}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <UserChip name={name} role={role} />
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
