"use client"

import { useState } from "react"
import Link from "next/link"
import { GraduationCap, Search, User, ChevronRight } from "lucide-react"

export default function AcademicPortalClient({ candidates }: { candidates: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCandidates = candidates
    .filter((c: any) => !c.academicTestResult)
    .filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const finishedCandidates = candidates.filter((c: any) => c.academicTestResult)

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-20">
      <div className="max-w-2xl mx-auto space-y-10 pt-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative h-28 w-28 mx-auto group">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-[40px] blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500" />
            <div className="relative h-28 w-28 bg-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-emerald-500/10 border border-emerald-50 overflow-hidden p-2">
              <img 
                src="/logo-smp.png" 
                alt="Logo SMP Al Fakhir"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Akademik</h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest leading-none">Al Fakhir Middle School</p>
          </div>
        </div>

        {/* Search & Selection Area */}
        <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-slate-200 border border-slate-100 space-y-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-emerald-500" />
                Cari Nama Anda
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Ketik nama Anda di bawah untuk mulai mengerjakan soal.
              </p>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Tulis nama lengkap Anda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-16 pl-14 pr-6 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-800 text-lg shadow-inner"
              />
            </div>
          </div>

          {/* List of Candidates */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400 italic">
                  {searchTerm ? `Nama "${searchTerm}" tidak ditemukan.` : "Tidak ada siswa yang aktif."}
                </p>
              </div>
            ) : (
              filteredCandidates.map((candidate: any) => (
                <Link 
                  key={candidate.id} 
                  href={`/academic/${candidate.id}`}
                  className="group flex items-center justify-between p-5 rounded-3xl border-2 border-slate-50 bg-slate-50/30 hover:border-emerald-500 hover:bg-emerald-50 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:border-emerald-200 transition-all overflow-hidden p-1.5">
                      <img 
                        src="/logo-smp.png" 
                        alt="Logo Unit"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 uppercase tracking-tight group-hover:text-emerald-900 transition-colors">{candidate.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">MULAI OBSERVASI</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </Link>
              ))
            )}
          </div>

          {/* Finished Section */}
          {!searchTerm && finishedCandidates.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 text-center">Siswa yang Sudah Selesai</p>
               <div className="flex flex-wrap justify-center gap-2">
                  {finishedCandidates.map((c: any) => (
                    <div key={c.id} className="px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-[11px] font-bold text-slate-400 line-through opacity-60">
                      {c.name}
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center">
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
             Jika nama Anda tidak ada, silahkan hubungi<br />panitia observasi di depan.
           </p>
        </div>
      </div>
    </div>
  )
}
