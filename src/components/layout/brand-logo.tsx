"use client"

import { usePathname } from "next/navigation"
import { GraduationCap } from "lucide-react"

export function BrandLogo({ role }: { role: string }) {
  const pathname = usePathname()
  
  const currentPath = pathname.toLowerCase()
  const currentRole = role?.toLowerCase() || ""

  const isSD = currentPath.includes("sd") || currentRole.includes("sd")
  const isSMP = currentPath.includes("smp") || currentRole.includes("smp")

  if (isSD) {
    return (
      <>
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg">
          <img src="/logo-sd.png" alt="Logo SD Al Fakhir" className="w-full h-full object-contain p-1" />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-black tracking-tight leading-none uppercase text-white">AL FAKHIR</span>
          <span className="text-[8px] font-bold text-orange-400 tracking-[0.2em] uppercase">Unit SD</span>
        </div>
      </>
    )
  }

  if (isSMP) {
    return (
      <>
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg">
          <img src="/logo-smp.png" alt="Logo SMP Al Fakhir" className="w-full h-full object-contain p-1" />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-black tracking-tight leading-none uppercase text-white">AL FAKHIR</span>
          <span className="text-[8px] font-bold text-emerald-400 tracking-[0.2em] uppercase">Unit SMP</span>
        </div>
      </>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center -space-x-2">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-lg relative z-10 border border-white/10">
          <img src="/logo-sd.png" alt="Logo SD" className="w-full h-full object-contain p-1" />
        </div>
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-lg relative z-0 border border-white/10">
          <img src="/logo-smp.png" alt="Logo SMP" className="w-full h-full object-contain p-1" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-black tracking-tight leading-none uppercase text-white">AL FAKHIR</span>
        <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase italic mt-0.5">Observation System</span>
      </div>
    </div>
  )
}
