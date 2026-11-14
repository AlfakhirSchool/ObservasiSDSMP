"use client"

import { useState, useEffect, useMemo } from "react"
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
  Layers,
  Check,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, cn } from "@/lib/utils"
import type { PeriodSummaryItem } from "@/lib/data-service"

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
    academicYear?: string | null
    gelombang?: number
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
  periodSummary?: PeriodSummaryItem[]
}

interface Props {
  stats: Stats
  role?: string
  availablePeriods?: PeriodSummaryItem[]
  availableYears?: { year: string; count: number }[]
  initialYear?: string
  initialWave?: string
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
  availablePeriods: initialPeriods = [],
  initialYear = "2027/2028",
  initialWave = "all",
}: Props) {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [selectedYear, setSelectedYear] = useState<string>(initialYear)
  const [selectedWave, setSelectedWave] = useState<string>(initialWave)
  const [isChangingFilter, setIsChangingFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateQuery, setDateQuery] = useState("")
  // Daftar periode aktif dari stats terkini atau initial props
  const periods = useMemo<PeriodSummaryItem[]>(() => {
    if (stats.periodSummary && stats.periodSummary.length > 0) {
      return stats.periodSummary
    }
    return initialPeriods
  }, [stats.periodSummary, initialPeriods])

  // Daftar tahun unik (terbaru dulu)
  const years = useMemo<string[]>(() => {
    const set = new Set<string>()
    const list: string[] = []
    for (const p of periods) {
      if (!set.has(p.academicYear)) {
        set.add(p.academicYear)
        list.push(p.academicYear)
      }
    }
    return list.sort((a, b) => b.localeCompare(a))
  }, [periods])

  // Total siswa per tahun
  const yearCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const p of periods) {
      counts[p.academicYear] = (counts[p.academicYear] ?? 0) + p.count
    }
    return counts
  }, [periods])

  // Gelombang yang tersedia untuk tahun yang sedang dipilih
  const availableWaves = useMemo(() => {
    if (selectedYear === "all") {
      const waveMap = new Map<number, number>()
      for (const p of periods) {
        waveMap.set(p.gelombang, (waveMap.get(p.gelombang) ?? 0) + p.count)
      }
      return Array.from(waveMap.entries())
        .map(([wave, count]) => ({ wave, count }))
        .sort((a, b) => a.wave - b.wave)
    }
    return periods
      .filter((p) => p.academicYear === selectedYear)
      .map((p) => ({ wave: p.gelombang, count: p.count }))
      .sort((a, b) => a.wave - b.wave)
  }, [periods, selectedYear])

  const totalAllCandidates = useMemo(() => periods.reduce((sum, p) => sum + p.count, 0), [periods])

  const fetchStats = async (year: string, wave: string) => {
    setIsChangingFilter(true)
    try {
      const level = role === "admin_sd" ? "SD" : role === "admin_smp" ? "SMP" : ""
      const params = new URLSearchParams()
      if (level) params.set("level", level)
      if (year && year !== "all") params.set("academicYear", year)
      if (wave && wave !== "all") params.set("gelombang", wave)

      const res = await fetch(`/api/admin/stats?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as Stats
        setStats(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsChangingFilter(false)
    }
  }

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear)
    // Jika gelombang yang aktif tidak ada di tahun baru, ubah ke "all"
    const waveExists = periods.some(
      (p) => (newYear === "all" || p.academicYear === newYear) && String(p.gelombang) === selectedWave
    )
    const nextWave = waveExists ? selectedWave : "all"
    if (nextWave !== selectedWave) {
      setSelectedWave(nextWave)
    }
    void fetchStats(newYear, nextWave)
  }

  const handleWaveChange = (newWave: string) => {
    setSelectedWave(newWave)
    void fetchStats(selectedYear, newWave)
  }

  const handlePeriodSelect = (year: string, wave: string) => {
    setSelectedYear(year)
    setSelectedWave(wave)
    void fetchStats(year, wave)
  }

  useEffect(() => {
    const poll = async () => {
      try {
        const level = role === "admin_sd" ? "SD" : role === "admin_smp" ? "SMP" : ""
        const params = new URLSearchParams()
        if (level) params.set("level", level)
        if (selectedYear && selectedYear !== "all") params.set("academicYear", selectedYear)
        if (selectedWave && selectedWave !== "all") params.set("gelombang", selectedWave)

        const res = await fetch(`/api/admin/stats?${params.toString()}`)
        if (res.ok) {
          const data = (await res.json()) as Stats
          setStats(data)
        }
      } catch {
        // Silent error for polling
      }
    }

    return startPolling(poll, 30000)
  }, [role, selectedYear, selectedWave])

  const title =
    role === "admin_sd" ? "Dashboard Unit SD" : role === "admin_smp" ? "Dashboard Unit SMP" : "Ringkasan"

  const hasChartData = stats.chartData.some((d) => d.baru > 0 || d.selesai > 0)
  const progress = Math.min(100, Math.max(0, stats.progressPercentage))
  const query = searchQuery.trim().toLowerCase()

  const filtered = stats.recentObservations.filter((obs) => {
    const matchSearch =
      obs.candidate.name.toLowerCase().includes(query) ||
      obs.interviewerName.toLowerCase().includes(query)
    const matchDate = !dateQuery || toLocalDateString(obs.createdAt) === dateQuery
    return matchSearch && matchDate
  })

  const isFiltered = selectedYear !== "all" || selectedWave !== "all"

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Pemantauan progres observasi penerimaan siswa"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown 1: Tahun Ajaran */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Tahun:</span>
              <select
                aria-label="Filter Tahun Ajaran"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="h-8 rounded-lg border-0 bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer hover:text-emerald-700"
              >
                {years.map((y, idx) => (
                  <option key={y} value={y}>
                    TA {y} {idx === 0 ? "(Terbaru)" : ""} ({yearCounts[y] ?? 0})
                  </option>
                ))}
                <option value="all">Semua Tahun ({totalAllCandidates})</option>
              </select>
            </div>

            {/* Dropdown 2: Gelombang */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Gelombang:</span>
              <select
                aria-label="Filter Gelombang"
                value={selectedWave}
                onChange={(e) => handleWaveChange(e.target.value)}
                className="h-8 rounded-lg border-0 bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer hover:text-emerald-700"
              >
                <option value="all">Semua Gelombang</option>
                {availableWaves.map((w) => (
                  <option key={w.wave} value={String(w.wave)}>
                    Gelombang {w.wave} ({w.count})
                  </option>
                ))}
              </select>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Sistem aktif
            </span>
          </div>
        }
      />

      {/* Panel Navigasi Periode & Gelombang (Jelas & Terlihat di Layar) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Layers size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tahun Masuk &amp; Gelombang Pendaftaran</h2>
              <p className="text-xs text-slate-500">
                Pilih periode untuk membatasi ringkasan data, grafik, dan statistik observasi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
              <span className="text-slate-500">Tahun:</span>
              <select
                aria-label="Pilih Tahun Masuk"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                {years.map((y, idx) => (
                  <option key={y} value={y}>
                    TA {y} {idx === 0 ? "(Terbaru)" : ""}
                  </option>
                ))}
                <option value="all">Semua Tahun</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
              <span className="text-slate-500">Gelombang:</span>
              <select
                aria-label="Pilih Gelombang"
                value={selectedWave}
                onChange={(e) => handleWaveChange(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Semua Gelombang</option>
                {availableWaves.map((w) => (
                  <option key={w.wave} value={String(w.wave)}>
                    Gelombang {w.wave}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Baris Tombol Cepat Pilihan Periode Masuk */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
            Pilihan Cepat:
          </span>
          {periods.map((p) => {
            const isMatch =
              selectedYear === p.academicYear && (selectedWave === String(p.gelombang) || (selectedWave === "all" && periods.filter((x) => x.academicYear === p.academicYear).length === 1))
            return (
              <button
                key={`${p.academicYear}-${p.gelombang}`}
                type="button"
                onClick={() => handlePeriodSelect(p.academicYear, String(p.gelombang))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all shadow-sm",
                  isMatch
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-emerald-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50"
                )}
              >
                {isMatch && <Check size={14} className="stroke-[3]" aria-hidden="true" />}
                <span>TA {p.academicYear} · Gelombang {p.gelombang}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isMatch ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {p.count} siswa
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => handlePeriodSelect("all", "all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all shadow-sm",
              selectedYear === "all" && selectedWave === "all"
                ? "border-slate-800 bg-slate-800 text-white shadow-slate-200"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            )}
          >
            <span>Semua Periode ({totalAllCandidates})</span>
          </button>
        </div>
      </section>

      {/* Banner status filter aktif */}
      {isFiltered && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Menampilkan data ringkasan untuk:{" "}
              <strong>
                {selectedYear === "all" ? "Semua Tahun Ajaran" : `Tahun Ajaran ${selectedYear}`}
              </strong>
              {" · "}
              <strong>
                {selectedWave === "all" ? "Semua Gelombang" : `Gelombang ${selectedWave}`}
              </strong>
              {isChangingFilter ? " (Memperbarui data...)" : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handlePeriodSelect("all", "all")}
            className="font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-900 transition-colors"
          >
            Tampilkan semua periode
          </button>
        </div>
      )}

      {/* Kartu Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={
            selectedYear !== "all"
              ? `Siswa Baru (${selectedYear}${selectedWave !== "all" ? ` · Gel. ${selectedWave}` : ""})`
              : "Siswa Baru"
          }
          value={stats.total}
          icon={UserPlus}
          tone="blue"
        />
        <StatCard label="Selesai Observasi" value={stats.notesTotal} icon={ClipboardCheck} tone="emerald" />
        <StatCard label="Diterima" value={stats.completed} icon={CheckCircle2} tone="violet" />
        <StatCard label="Tertunda" value={stats.pending} icon={Clock} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Siswa baru &amp; observasi selesai</h2>
            <p className="text-sm text-slate-500">
              Aktivitas 7 hari terakhir
              {selectedYear !== "all" ? ` · TA ${selectedYear}` : ""}
              {selectedWave !== "all" ? ` · Gelombang ${selectedWave}` : ""}
            </p>
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
              description="Belum ada siswa baru atau observasi selesai dalam 7 hari terakhir pada periode yang dipilih."
              className="h-72"
            />
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Target observasi</h2>
            <p className="text-sm text-slate-500">
              {selectedYear !== "all" ? `TA ${selectedYear}` : "Semua Tahun"}
              {selectedWave !== "all" ? ` · Gelombang ${selectedWave}` : ""}
            </p>
            <p className="mt-4 text-4xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">
              {stats.monthlyTarget}
              <span className="ml-2 text-sm font-medium text-slate-500">siswa</span>
            </p>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {stats.notesTotal} dari {stats.monthlyTarget} diobservasi
                </span>
                <span className="font-semibold text-slate-900">{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
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

      {/* Bagian Observasi Terkini dengan Informasi Tahun & Gelombang Siswa */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Observasi terkini</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {selectedYear !== "all" ? `TA ${selectedYear}` : "Semua Tahun"}
                {selectedWave !== "all" ? ` · Gel. ${selectedWave}` : ""}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Data input catatan terbaru dari tim pewawancara
            </p>
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
            description={
              searchQuery || dateQuery
                ? "Coba ubah kata kunci atau tanggal."
                : `Belum ada catatan observasi untuk ${selectedYear !== "all" ? `TA ${selectedYear}` : "periode ini"}.`
            }
          />
        ) : (
          <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
            {filtered.map((obs) => (
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
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                        {obs.candidate.level}
                      </span>
                      {/* Label Tahun Masuk / TA */}
                      {obs.candidate.academicYear && (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                          TA {obs.candidate.academicYear}
                        </span>
                      )}
                      {/* Label Gelombang */}
                      <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">
                        Gelombang {obs.candidate.gelombang ?? 1}
                      </span>
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
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
