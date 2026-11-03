"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type Unit = "sd" | "smp" | null

export function BrandLogo({ role, textClassName }: { role: string; textClassName?: string }) {
  const pathname = usePathname()

  const segments = pathname.toLowerCase().split("/").filter(Boolean)
  const currentRole = role?.toLowerCase() || ""

  let unit: Unit = null
  if (segments.includes("sd") || currentRole.includes("sd")) unit = "sd"
  else if (segments.includes("smp") || currentRole.includes("smp")) unit = "smp"

  if (unit) {
    const isSD = unit === "sd"
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
          <img
            src={isSD ? "/logo-sd.png" : "/logo-smp.png"}
            alt={isSD ? "Logo SD Al Fakhir" : "Logo SMP Al Fakhir"}
            className="h-full w-full object-contain p-1"
          />
        </div>
        <div className={cn("flex flex-col leading-tight", textClassName)}>
          <span className="text-sm font-semibold text-white">Al Fakhir</span>
          <span className={isSD ? "text-xs font-medium text-orange-400" : "text-xs font-medium text-emerald-400"}>
            Unit {isSD ? "SD" : "SMP"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center -space-x-2">
        <div className="relative z-10 flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
          <img src="/logo-sd.png" alt="Logo SD" className="h-full w-full object-contain p-1" />
        </div>
        <div className="relative z-0 flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
          <img src="/logo-smp.png" alt="Logo SMP" className="h-full w-full object-contain p-1" />
        </div>
      </div>
      <div className={cn("flex flex-col leading-tight", textClassName)}>
        <span className="text-sm font-semibold text-white">Al Fakhir</span>
        <span className="text-xs text-slate-400">Observation System</span>
      </div>
    </div>
  )
}
