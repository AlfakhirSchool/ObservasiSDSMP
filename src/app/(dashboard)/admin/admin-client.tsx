"use client"

import { useState, useEffect } from "react"
import { startPolling } from "@/lib/polling"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  UserPlus,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  CircleDot,
  Search,
  ChevronRight,
  BarChart3,
  Inbox,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, getAcademicYear, cn } from "@/lib/utils"

interface Observation {
  id: string
  candidateId: string
  interviewerName: string
  recommendation: string
  createdAt: string | Date
  candidate: {
    name: string
    level: string
    room: string | null
  }
}

interface ChartPoint {
  name: string
  baru: number
  selesai: number
}

interface StatusItem {
  label: string
  color?: string
}

interface Stats {
  total: number
  pending: number
  received: number
  reviewed: number
  completed: number
  notesTotal: number
  recentObservations: Observation[]
  chartData: ChartPoint[]
  monthlyTarget: number
  progressPercentage: number
  statusItems: StatusItem[]
}

interface Props {
  stats: Stats
  role?: string
  availableYears?: { year: string; count: number }[]
  initialYear?: string
}

const STATUS_ICONS: { icon: LucideIcon; tone: string }[] = [
  { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  { icon: RefreshCw, tone: "bg-blue-50 text-blue-600" },
  { icon: Clock, tone: "bg-amber-50 text-amber-600" },
]

const REC_PILL: Record<string, string> = {
  Terima: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Tolak: "bg-rose-50 text-rose-700 ring-rose-200",
}
const REC_PILL_DEFAULT = "bg-amber-50 text-amber-700 ring-amber-200"

const inputClass =
  "h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"

function toLocalDateString(value: string | Date): string {
  const d = new Date(value)
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${month}-${day}`
}

export default function AdminOverviewClient({ 
  stats: initialStats, 
  role = "admin",
  availableYears = [],
  initialYear = "2027/2028"
}: Props) {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [selectedYear, setSelectedYear] = useState<string>(initialYear)
  const [isChangingYear, setIsChangingYear] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateQuery, setDateQuery] = useState("")

  const handleYearChange = async (year: string) => {
    setSelectedYear(year)
    setIsChangingYear(true)
    try {
      const level = role === "admin_sd" ? "SD" : role === "admin_smp" ? "SMP" : ""
      const params = new URLSearchParams()
      if (level) params.set("level", level)
      if (year && year !== "all") params.set("academicYear", year)
      
      const res = await fetch(`/api/admin/stats?${params.toString()}`)
      if (res.ok) {
        setStats((await res.json()) as Stats)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsChangingYear(false)
    }
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const level = role === "admin_sd" ? "SD" : role === "admin_smp" ? "SMP" : ""
        const params = new URLSearchParams()
        if (level) params.set("level", level)
        if (selectedYear && selectedYear !== "all") params.set("academicYear", selectedYear)

        const res = await fetch(`/api/admin/stats?${params.toString()}`)
        if (res.ok) {
          setStats((await res.json()) as Stats)
        }
      } catch {
        // Silent error for polling
      }
    }

    return startPolling(fetchStats, 30000) // 30s dan berhenti saat tab tersembunyi
  }, [role, selectedYear])

  const title =
    role === "admin_sd" ? "Dashboard Unit SD" : role === "admin_smp" ? "Dashboard Unit SMP" : "Ringkasan"

  const hasChartData = stats.chartData.some((d) => d.baru > 0 || d.selesai > 0)
  const progress = Math.min(100, Math.max(0, stats.progressPercentage))
  const query = searchQuery.trim().toLowerCase()

  const filtered = stats.recentObservations.filter((obs) => {
    const matchSearch =
      obs.candidate.name.toLowerCase().includes(query) ||
      obs.interviewerName.toLowerCase().includes(query)
    // Bandingkan dengan tanggal lokal agar sesuai zona waktu pengguna
    const matchDate = !dateQuery || toLocalDateString(obs.createdAt) === dateQuery
    return matchSearch && matchDate
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Pemantauan progres observasi penerimaan siswa"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 pl-1">Tahun Ajaran:</span>
              <select
                aria-label="Pilih Tahun Ajaran"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="h-8 rounded-lg border-0 bg-transparent px-2 text-xs font-bold text-slate-800 outline-none cursor-pointer hover:text-emerald-700 focus:ring-0"
              >
                {availableYears.length > 0 ? (
                  <>
                    {availableYears.map((ay, idx) => (
                      <option key={ay.year} value={ay.year}>
                        {idx === 0 ? `TA ${ay.year} (Observasi Baru)` : `TA ${ay.year}`} ({ay.count})
                      </option>
                    ))}
                    <option value="all">Semua Tahun</option>
                  </>
                ) : (
                  <>
                    <option value="2027/2028">TA 2027/2028 (Observasi Baru)</option>
                    <option value="2026/2027">TA 2026/2027</option>
                    <option value="all">Semua Tahun</option>
                  </>
                )}
              </select>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Sistem aktif
            </span>
          </div>
        }
      />

      {/* Info Banner when filtered by active year */}
      {selectedYear !== "all" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Menampilkan data <strong>Tahun Ajaran {selectedYear}</strong>. Data observasi tahun lalu disembunyikan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleYearChange("all")}
            className="font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-900 transition-colors"
          >
            Lihat semua tahun
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Siswa Baru" value={stats.total} icon={UserPlus} tone="blue" />
        <StatCard label="Selesai Observasi" value={stats.notesTotal} icon={ClipboardCheck} tone="emerald" />
        <StatCard label="Diterima" value={stats.completed} icon={CheckCircle2} tone="violet" />
        <StatCard label="Tertunda" value={stats.pending} icon={Clock} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Siswa baru &amp; observasi selesai</h2>
            <p className="text-sm text-slate-500">Aktivitas 7 hari terakhir</p>
          </div>
          {hasChartData ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stats.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: "#F1F5F9" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: "#475569" }} />
                  <Bar dataKey="baru" name="Siswa baru" fill="#3B82F6" maxBarSize={28} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="selesai" name="Observasi selesai" fill="#10B981" maxBarSize={28} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Belum ada aktivitas"
              description="Belum ada siswa baru atau observasi selesai dalam 7 hari terakhir."
              className="h-72"
            />
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Target observasi</h2>
            <p className="text-sm text-slate-500">Bulan ini</p>
            <p className="mt-4 text-4xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">
              {stats.monthlyTarget}
              <span className="ml-2 text-sm font-medium text-slate-500">siswa</span>
            </p>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {stats.notesTotal} dari {stats.monthlyTarget} diobservasi
                </span>
                <span className="font-semibold text-slate-900 tabular-nums">{stats.progressPercentage}%</span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progres target observasi"
              >
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </section>

          <section className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Status ringkasan</h2>
            <ul className="mt-4 space-y-3">
              {stats.statusItems.map((item, idx) => {
                const meta = STATUS_ICONS[idx] ?? { icon: CircleDot, tone: "bg-slate-100 text-slate-600" }
                const Icon = meta.icon
                return (
                  <li key={item.label} className="flex items-center gap-3">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                      <Icon size={16} />
                    </span>
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Observasi terkini</h2>
            <p className="text-sm text-slate-500">Data input catatan terbaru dari tim pewawancara</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              aria-label="Filter tanggal observasi"
              className={cn(inputClass, "px-3")}
            />
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama siswa atau pewawancara"
                aria-label="Cari nama siswa atau pewawancara"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(inputClass, "w-full pl-9 pr-3 sm:w-72")}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : "Belum ada data observasi masuk"}
            description={searchQuery || dateQuery ? "Coba ubah kata kunci atau tanggal." : undefined}
          />
        ) : (
          <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
            {filtered.map((obs) => {
              const isNew = new Date(obs.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
              return (
                <li key={obs.id}>
                  <Link
                    href={`/admin/candidates/${obs.candidateId}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={obs.candidate.level === "SD" ? "/logo-sd.png" : "/logo-smp.png"}
                        alt={`Logo ${obs.candidate.level}`}
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{obs.candidate.name}</p>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                          {obs.candidate.level}
                        </span>
                        {isNew && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Pewawancara: <span className="text-slate-700">{obs.interviewerName}</span>
                        <span aria-hidden="true"> · </span>
                        Ruangan: <span className="text-slate-700">{obs.candidate.room || "-"}</span>
                        <span aria-hidden="true"> · </span>
                        {formatDate(obs.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                        REC_PILL[obs.recommendation] ?? REC_PILL_DEFAULT
                      )}
                    >
                      {obs.recommendation}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-slate-500">
        Al Fakhir Modern Islamic School · Developer by Feri
      </p>
    </div>
  )
}
