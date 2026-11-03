"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      aria-label="Keluar"
      title="Keluar"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
        className
      )}
    >
      <LogOut size={16} aria-hidden="true" />
      <span>Keluar</span>
    </button>
  )
}
