import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import InterviewerDashboardClient from "./interviewer-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Siswa Saya - Al Fakhir",
}

import { GraduationCap, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function InterviewerHubPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10 animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">Pilih Unit Observasi</h1>
        <p className="text-slate-400 font-medium tracking-wide max-w-md mx-auto">
          Silakan pilih unit sekolah untuk mulai melakukan observasi dan mencatat hasil wawancara siswa.
        </p>
        <div className="h-1.5 w-32 bg-emerald-500 rounded-full mx-auto mt-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* SD CARD */}
        <Link 
          href="/interviewer/sd"
          className="group relative bg-white rounded-[48px] p-10 border-2 border-slate-100 hover:border-orange-500 shadow-2xl shadow-slate-200/50 hover:shadow-orange-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-20 h-20 rounded-[28px] bg-white border border-orange-100 flex items-center justify-center shadow-lg mb-8 group-hover:scale-110 transition-transform overflow-hidden p-2">
              <img src="/logo-sd.png" alt="SD Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight mb-2">Unit SD</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">Sekolah Dasar</p>
            <div className="mt-auto flex items-center gap-2 text-orange-600 font-black italic uppercase tracking-tight">
              Masuk <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </Link>

        {/* SMP CARD */}
        <Link 
          href="/interviewer/smp"
          className="group relative bg-white rounded-[48px] p-10 border-2 border-slate-100 hover:border-emerald-500 shadow-2xl shadow-slate-200/50 hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-20 h-20 rounded-[28px] bg-white border border-emerald-100 flex items-center justify-center shadow-lg mb-8 group-hover:scale-110 transition-transform overflow-hidden p-2">
              <img src="/logo-smp.png" alt="SMP Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight mb-2">Unit SMP</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">Sekolah Menengah Pertama</p>
            <div className="mt-auto flex items-center gap-2 text-emerald-600 font-black italic uppercase tracking-tight">
              Masuk <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
