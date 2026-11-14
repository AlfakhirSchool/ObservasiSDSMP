"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  UserCheck,
  BookOpen,
  Table2,
  GraduationCap,
  Play,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { TimerBadge, useInterviewTimer } from "@/components/interview-timer"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, cn } from "@/lib/utils"
import { ITEMS_PER_PAGE } from "@/lib/constants"
import { PeriodFilter } from "@/components/ui/period-filter"
import { PERIOD_ALL, PERIOD_LATEST, filterByPeriod, listPeriods, type PeriodFilterValue } from "@/lib/period"

interface Candidate {
  id: string
  name: string
  hasResponse: boolean
  hasNote: boolean
  selectedInterviewer: string | null
  createdAt: string
  academicYear: string | null
  gelombang: number
}

interface Props {
  unit: "SD" | "SMP"
  initialCandidates: Candidate[]
  /** When set (role interviewer), the list is locked to this interviewer and the name select is hidden. */
  lockedInterviewer?: string
}

type StatusFilter = "" | "pending" | "done" | "no-form"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "Semua status" },
  { value: "pending", label: "Perlu observasi" },
  { value: "done", label: "Sudah dicatat" },
  { value: "no-form", label: "Formulir belum ada" },
]

const FIELD_CLASS =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"

const PILL_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"

function UnitBadge({ unit }: { unit: "SD" | "SMP" }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: unit === "SMP" ? "#0D5C63" : "#E67E22" }}
    >
      Unit {unit}
    </span>
  )
}

export default function InterviewerDashboardClient({ unit, initialCandidates, lockedInterviewer }: Props) {
  const router = useRouter()
  const timer = useInterviewTimer()
  const [search, setSearch] = useState("")
  const [dateQuery, setDateQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("")
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState<PeriodFilterValue>(PERIOD_LATEST)

  const candidates = useMemo(() => {
    // Untuk SD: semua siswa SD tampil di semua observer SD
    if (!lockedInterviewer || unit === "SD") return initialCandidates
    return initialCandidates.filter((c) => c.selectedInterviewer === lockedInterviewer)
  }, [initialCandidates, lockedInterviewer, unit])

  const periods = useMemo(() => listPeriods(candidates), [candidates])

  // Mencari nama menembus penyembunyian data lama agar siswa lama tetap bisa ditemukan.
  const scoped = useMemo(() => {
    const effectivePeriod = period === PERIOD_LATEST && search.trim() ? PERIOD_ALL : period
    return filterByPeriod(candidates, effectivePeriod, periods)
  }, [candidates, periods, period, search])

  const stats = useMemo(() => {
    return {
      total: scoped.length,
      withForms: scoped.filter((c) => c.hasResponse).length,
      withNotes: scoped.filter((c) => c.hasNote).length,
      pending: scoped.filter((c) => c.hasResponse && !c.hasNote).length,
    }
  }, [scoped])

  const filtered = useMemo(() => {
    return scoped.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      let matchDate = true
      if (dateQuery && c.createdAt) {
        const d = new Date(c.createdAt)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        matchDate = `${year}-${month}-${day}` === dateQuery
      }
      let matchStatus = true
      if (statusFilter === "pending") matchStatus = c.hasResponse && !c.hasNote
      else if (statusFilter === "done") matchStatus = c.hasNote
      else if (statusFilter === "no-form") matchStatus = !c.hasResponse
      return matchSearch && matchDate && matchStatus
    })
  }, [scoped, search, dateQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const hasActiveFilter = Boolean(search || dateQuery || statusFilter)

  const resetFilters = () => {
    setSearch("")
    setDateQuery("")
    setStatusFilter("")
    setPage(1)
  }

  // Membuka siswa untuk diwawancarai = memulai timer 8 menit (jika timer akun aktif dan siswa belum dicatat).
  const startTimerFor = (c: Candidate) => {
    if (!c.hasNote) timer.start({ candidateId: c.id, name: c.name, unit })
  }
  const timerOf = (id: string) => timer.entries.find((e) => e.candidateId === id)

  return (
    <div className="space-y-6">
      <PageHeader
        badge={<UnitBadge unit={unit} />}
        title="Dashboard Pewawancara"
        description="Daftar siswa dan progres observasi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {unit === "SMP" && (
              <Link
                href="/interviewer/rekap?unit=SMP&sumber=akademik"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <GraduationCap size={16} className="text-emerald-600" aria-hidden="true" />
                Tes Akademik SMP
              </Link>
            )}
            <Link
              href={`/interviewer/quran?unit=${unit}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <BookOpen size={16} className={unit === "SD" ? "text-orange-600" : "text-emerald-600"} aria-hidden="true" />
              Al-Qur&apos;an {unit}
            </Link>
            <Link
              href={`/interviewer/rekap?unit=${unit}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Table2 size={16} className={unit === "SD" ? "text-orange-600" : "text-emerald-600"} aria-hidden="true" />
              Rekap {unit}
            </Link>
            {lockedInterviewer && (
              <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <UserCheck size={16} className="text-emerald-600" aria-hidden="true" />
                Menampilkan siswa untuk <span className="font-semibold text-slate-900">{lockedInterviewer}</span>
              </p>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={lockedInterviewer ? "Siswa saya" : "Total siswa"} value={stats.total} icon={Users} tone="blue" />
        <StatCard label="Formulir masuk" value={stats.withForms} icon={FileText} tone="emerald" />
        <StatCard label="Selesai dicatat" value={stats.withNotes} icon={CheckCircle} tone="violet" />
        <StatCard label="Perlu tindakan" value={stats.pending} icon={Clock} tone="amber" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <label htmlFor="search-student" className="text-sm font-medium text-slate-700">
            Cari siswa
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="search-student"
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className={cn(FIELD_CLASS, "w-full pl-9")}
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label htmlFor="filter-date" className="text-sm font-medium text-slate-700">
            Tanggal masuk
          </label>
          <input
            id="filter-date"
            type="date"
            value={dateQuery}
            onChange={(e) => {
              setDateQuery(e.target.value)
              setPage(1)
            }}
            className={cn(FIELD_CLASS, "w-full sm:w-auto")}
          />
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label htmlFor="filter-status" className="text-sm font-medium text-slate-700">
            Status observasi
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter)
              setPage(1)
            }}
            className={cn(FIELD_CLASS, "w-full sm:w-52")}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <PeriodFilter className="w-full sm:w-auto" periods={periods} value={period} onChange={(v) => { setPeriod(v); setPage(1) }} />
        {hasActiveFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {paginated.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasActiveFilter ? "Tidak ada siswa yang cocok" : "Belum ada siswa"}
            description={
              hasActiveFilter
                ? "Ubah kata kunci atau filter untuk melihat siswa lain."
                : lockedInterviewer
                  ? "Belum ada siswa yang ditugaskan kepada Anda."
                  : "Belum ada siswa yang terdaftar pada unit ini."
            }
            action={
              hasActiveFilter ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                >
                  Reset filter
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
          {/* Tampilan HP: kartu per siswa */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {paginated.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/interviewer/${c.id}?unit=${unit}`}
                  onClick={() => startTimerFor(c)}
                  className="block space-y-2 px-4 py-3.5 active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{c.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(c.createdAt)} · TA {c.academicYear ?? "-"} · Gelombang {c.gelombang}
                      </p>
                    </div>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-slate-400" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-slate-600">
                    Pewawancara:{" "}
                    <span className="font-medium text-slate-800">
                      {unit === "SD" ? "Semua Observer SD" : (c.selectedInterviewer || "Belum ditunjuk")}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.hasResponse ? (
                      <span className={cn(PILL_BASE, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>Formulir: Sudah diisi</span>
                    ) : (
                      <span className={cn(PILL_BASE, "bg-slate-100 text-slate-600 ring-slate-200")}>Formulir: Belum ada</span>
                    )}
                    {c.hasNote ? (
                      <span className={cn(PILL_BASE, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>Sudah dicatat</span>
                    ) : c.hasResponse ? (
                      <span className={cn(PILL_BASE, "bg-amber-50 text-amber-700 ring-amber-200")}>Perlu observasi</span>
                    ) : null}
                    {timerOf(c.id) && <TimerBadge entry={timerOf(c.id)!} now={timer.now} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tampilan tablet/desktop: tabel */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Nama siswa</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pewawancara</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Formulir</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status observasi</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      startTimerFor(c)
                      router.push(`/interviewer/${c.id}?unit=${unit}`)
                    }}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(c.createdAt)} · TA {c.academicYear ?? "-"} · Gelombang {c.gelombang}</p>
                      {timerOf(c.id) && <TimerBadge entry={timerOf(c.id)!} now={timer.now} className="mt-1.5" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                          aria-hidden="true"
                        >
                          {unit === "SD" ? "SD" : (c.selectedInterviewer?.charAt(0).toUpperCase() || "?")}
                        </span>
                        <span className="text-sm text-slate-700">
                          {unit === "SD"
                            ? (c.selectedInterviewer && c.selectedInterviewer !== "Semua Observer SD" ? c.selectedInterviewer : "Semua Observer SD")
                            : (c.selectedInterviewer || "Belum ditunjuk")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.hasResponse ? (
                        <span className={cn(PILL_BASE, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>Sudah diisi</span>
                      ) : (
                        <span className={cn(PILL_BASE, "bg-slate-100 text-slate-600 ring-slate-200")}>Belum ada</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.hasNote ? (
                        <span className={cn(PILL_BASE, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>Sudah dicatat</span>
                      ) : c.hasResponse ? (
                        <span className={cn(PILL_BASE, "bg-amber-50 text-amber-700 ring-amber-200")}>Perlu observasi</span>
                      ) : (
                        <span className={cn(PILL_BASE, "bg-slate-100 text-slate-600 ring-slate-200")}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {timer.enabled && !c.hasNote && !timerOf(c.id) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              startTimerFor(c)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                          >
                            <Play size={14} aria-hidden="true" />
                            Mulai
                          </button>
                        )}
                        <Link
                          href={`/interviewer/${c.id}?unit=${unit}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            startTimerFor(c)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                        >
                          Detail
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination */}
        {filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600 tabular-nums">
              Halaman {currentPage} dari {totalPages} · {filtered.length} siswa
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
                title="Halaman sebelumnya"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Halaman berikutnya"
                title="Halaman berikutnya"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
