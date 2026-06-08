"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { formatDate, cn } from "@/lib/utils"
import { INTERVIEWERS, ITEMS_PER_PAGE } from "@/lib/constants"

interface Candidate {
  id: string
  name: string
  level: string
  hasResponse: boolean
  hasNote: boolean
  selectedInterviewer: string | null
  submittedAt?: Date
  createdAt: string
}

interface Props {
  initialCandidates: Candidate[]
}

export default function InterviewerDashboardClient({ initialCandidates }: Props) {
  const router = useRouter()
  const [selectedName, setSelectedName] = useState("")
  const [search, setSearch] = useState("")
  const [dateQuery, setDateQuery] = useState("")
  const [page, setPage] = useState(1)

  const candidates = useMemo(() => {
    if (!selectedName) return initialCandidates
    return initialCandidates.filter(c => c.selectedInterviewer === selectedName)
  }, [initialCandidates, selectedName])

  const stats = useMemo(() => {
    return {
      total: candidates.length,
      withForms: candidates.filter((c) => c.hasResponse).length,
      withNotes: candidates.filter((c) => c.hasNote).length,
      pending: candidates.filter((c) => c.hasResponse && !c.hasNote).length,
    }
  }, [candidates])

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      let matchDate = true
      if (dateQuery && c.createdAt) {
        const d = new Date(c.createdAt)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        matchDate = `${year}-${month}-${day}` === dateQuery
      }
      return matchSearch && matchDate
    })
  }, [candidates, search, dateQuery])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const kpis = [
    { label: "Siswa Saya", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Formulir Masuk", value: stats.withForms, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Selesai Dicatat", value: stats.withNotes, icon: CheckCircle, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Perlu Tindakan", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ]

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-20">
      {/* Header with Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Pewawancara</h1>
          <p className="text-slate-400 font-medium tracking-wide">
            {selectedName ? `Menampilkan tugas untuk ${selectedName}` : "Menampilkan seluruh siswa yang terdaftar"}
          </p>
          <div className="h-1.5 w-32 bg-emerald-500 rounded-full mt-2" />
        </div>

        <div className="w-full md:w-72">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pilih Nama Anda</label>
          <select 
            value={selectedName}
            onChange={(e) => { setSelectedName(e.target.value); setPage(1); }}
            className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm"
          >
            <option value="">-- Pilih Nama Pewawancara --</option>
            {INTERVIEWERS.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="group p-8 rounded-[32px] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className={`h-14 w-14 rounded-2xl ${kpi.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <kpi.icon className={`h-7 w-7 ${kpi.color}`} />
              </div>
              <TrendingUp className="h-5 w-5 text-slate-100 group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filter & Table */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-2xl">
          <div className="relative group w-full sm:w-auto">
            <input 
              type="date"
              value={dateQuery}
              onChange={(e) => { setDateQuery(e.target.value); setPage(1) }}
              className="h-14 w-full sm:w-auto px-6 rounded-[24px] border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm cursor-pointer"
            />
          </div>
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-14 w-full rounded-[24px] border border-slate-200 bg-white pl-14 pr-6 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="rounded-[40px] border border-slate-200 bg-white overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Nama Siswa</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Jenjang</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Pewawancara</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Formulir</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status Observasi</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-24 text-slate-400 font-medium italic">
                      Belum ada siswa yang ditugaskan kepada Anda.
                    </td>
                  </tr>
                ) : (
                  paginated.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => router.push(`/interviewer/${c.id}`)}
                      className="group hover:bg-slate-50/50 cursor-pointer transition-colors duration-200"
                    >
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            <img 
                              src={c.level === "SD" ? "/logo-sd.png" : "/logo-smp.png"} 
                              alt={c.level} 
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-lg group-hover:text-emerald-600 transition-colors italic uppercase tracking-tighter">
                              {c.name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                              {formatDate(c.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <Badge className={c.level === "SD" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"}>
                          {c.level}
                        </Badge>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                            {c.selectedInterviewer?.charAt(0) || "?"}
                          </div>
                          <span className="font-bold text-[13px] text-slate-600 truncate max-w-[120px]">
                            {c.selectedInterviewer || "Belum Ditunjuk"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">
                           <div className={`h-2 w-2 rounded-full ${c.hasResponse ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-slate-200"}`} />
                           <span className={`font-bold text-xs uppercase tracking-tight ${c.hasResponse ? "text-emerald-600" : "text-slate-400"}`}>
                             {c.hasResponse ? "Selesai Diisi" : "Belum Ada"}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <Badge variant={c.hasNote ? "success" : "warning"} className="font-bold italic">
                          {c.hasNote ? "SUDAH DICATAT" : "PERLU OBSERVASI"}
                        </Badge>
                      </td>
                      <td className="px-8 py-7 text-right">
                        <div className="flex items-center justify-end gap-3 text-slate-300 group-hover:text-emerald-500 transition-colors">
                           <span className="text-xs font-black italic uppercase">Buka Detail</span>
                           <ArrowRight className="h-5 w-5" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-6 border-t border-slate-100 bg-slate-50/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {page} / {totalPages} HALAMAN
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 rounded-xl"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-10 rounded-xl"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
