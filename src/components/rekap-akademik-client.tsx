"use client"

import { useState, useMemo, useCallback, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Award,
  Search,
  FileSpreadsheet,
  RefreshCw,
  WifiOff,
  Inbox,
  ArrowRight,
} from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { PeriodFilter } from "@/components/ui/period-filter"
import {
  PERIOD_ALL,
  PERIOD_LATEST,
  filterByPeriod,
  listPeriods,
  type PeriodFilterValue,
} from "@/lib/period"
import {
  SMP_AKADEMIK_MAPEL,
  type RekapAkademikSmpRow,
} from "@/lib/rekap-akademik"
import { eksporRekapAkademikSmp } from "@/lib/rekap-excel"
import { cn } from "@/lib/utils"

interface Props {
  initialRows: RekapAkademikSmpRow[]
  detailBase?: string
  ownerName?: string
}

type StatusUjianFilter = "semua" | "sudah" | "belum"

const GRADE_PILL_CLASS: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200",
  B: "bg-blue-50 text-blue-700 ring-blue-200 border-blue-200",
  C: "bg-amber-50 text-amber-700 ring-amber-200 border-amber-200",
  D: "bg-rose-50 text-rose-700 ring-rose-200 border-rose-200",
}

const CONTROL =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"

const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}
const getOnlineSnapshot = () => !navigator.onLine
const getOnlineServerSnapshot = () => false

export function RekapAkademikClient({
  initialRows,
  detailBase = "/interviewer",
  ownerName,
}: Props) {
  const [rows, setRows] = useState<RekapAkademikSmpRow[]>(initialRows)
  const [loading, setLoading] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const isOffline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot)
  // Filter states
  const [period, setPeriod] = useState<PeriodFilterValue>(PERIOD_LATEST)
  const [query, setQuery] = useState("")
  const [statusUjian, setStatusUjian] = useState<StatusUjianFilter>("semua")

  // Fungsi muat ulang data dari server dengan penanganan jaringan rusak
  const reloadData = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setNetworkError("Tidak dapat memperbarui data: perangkat Anda tidak terhubung ke internet.")
      return
    }

    setLoading(true)
    setNetworkError(null)

    try {
      const res = await fetch("/api/academic/rekap", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })

      if (!res.ok) {
        throw new Error(`Server merespons dengan kode ${res.status}`)
      }

      const data = (await res.json()) as { rows?: RekapAkademikSmpRow[]; error?: string }
      if (data.error) throw new Error(data.error)

      if (data.rows) {
        setRows(data.rows)
      }
    } catch (err) {
      console.error("[reloadData]", err)
      setNetworkError(
        "Jaringan bermasalah atau server tidak dapat dijangkau. Silakan periksa koneksi internet Anda dan coba lagi."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Filter periode berdasarkan Tahun dan Gelombang
  const periods = useMemo(() => listPeriods(rows), [rows])
  const scopedByPeriod = useMemo(() => filterByPeriod(rows, period, periods), [rows, period, periods])

  // Filter pencarian nama / sekolah dan status ujian
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scopedByPeriod.filter((r) => {
      if (statusUjian === "sudah" && !r.sudahUjian) return false
      if (statusUjian === "belum" && r.sudahUjian) return false
      if (q) {
        const matchName = r.nama.toLowerCase().includes(q)
        const matchSchool = r.asalSekolah.toLowerCase().includes(q)
        const matchGuru = r.guru.toLowerCase().includes(q)
        if (!matchName && !matchSchool && !matchGuru) return false
      }
      return true
    })
  }, [scopedByPeriod, query, statusUjian])

  // Prioritaskan siswa milik pewawancara yang login
  const sortedRows = useMemo(() => {
    if (!ownerName) return filtered
    return [...filtered].sort((a, b) => Number(b.guru === ownerName) - Number(a.guru === ownerName))
  }, [filtered, ownerName])

  // Hitung ringkasan statistik data yang sudah masuk
  const totalSiswa = scopedByPeriod.length
  const sudahUjianCount = scopedByPeriod.filter((r) => r.sudahUjian).length
  const belumUjianCount = totalSiswa - sudahUjianCount
  const validScores = scopedByPeriod.filter((r) => r.totalScore !== null).map((r) => r.totalScore as number)
  const rataRataNilai =
    validScores.length > 0 ? (validScores.reduce((sum, s) => sum + s, 0) / validScores.length).toFixed(1) : "-"

  const handleExport = async () => {
    setExporting(true)
    try {
      await eksporRekapAkademikSmp(sortedRows)
    } catch (err) {
      console.error(err)
      alert("Gagal mengunduh file Excel. Silakan coba lagi.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. NOTIFIKASI JARINGAN RUSAK / OFFLINE ERROR */}
      {(networkError || isOffline) && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <WifiOff size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Koneksi Jaringan Bermasalah</p>
              <p className="text-xs text-rose-700">
                {networkError || "Tidak ada koneksi internet. Data yang ditampilkan adalah data terakhir yang tersimpan di memori."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={reloadData}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} aria-hidden="true" />
            <span>{loading ? "Menghubungkan..." : "Coba Lagi"}</span>
          </button>
        </div>
      )}

      {/* 2. STATISTIK RINGKASAN TES AKADEMIK SMP (DATA SUDAH MASUK) */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
              <div className="h-4 w-24 rounded bg-slate-200 mb-3" />
              <div className="h-8 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Total Siswa SMP"
            value={totalSiswa}
            icon={GraduationCap}
            tone="blue"
            hint="Siswa terdaftar pada periode ini"
          />
          <StatCard
            label="Sudah Ujian"
            value={sudahUjianCount}
            icon={CheckCircle2}
            tone="emerald"
            hint={`${totalSiswa > 0 ? Math.round((sudahUjianCount / totalSiswa) * 100) : 0}% telah menyelesaikan tes`}
          />
          <StatCard
            label="Belum Ujian"
            value={belumUjianCount}
            icon={Clock}
            tone="amber"
            hint="Belum ada catatan tes akademik"
          />
          <StatCard
            label="Rata-rata Nilai"
            value={rataRataNilai}
            icon={Award}
            tone="violet"
            hint="Skala 0 - 100 dari siswa yang sudah tes"
          />
        </div>
      )}

      {/* 3. TOOLBAR PENYARING (FILTER TAHUN, GELOMBANG, CARI, STATUS UJIAN, UNDUH EXCEL) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter className="w-full sm:w-auto" periods={periods} value={period} onChange={setPeriod} />

            <div className="relative min-w-0 flex-1 sm:w-64">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari siswa atau sekolah"
                placeholder="Cari siswa atau sekolah..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(CONTROL, "w-full pl-9")}
              />
            </div>

            <select
              aria-label="Filter status ujian"
              value={statusUjian}
              onChange={(e) => setStatusUjian(e.target.value as StatusUjianFilter)}
              className={cn(CONTROL, "w-full sm:w-auto")}
            >
              <option value="semua">Semua Status Ujian</option>
              <option value="sudah">Sudah Ujian ({sudahUjianCount})</option>
              <option value="belum">Belum Ujian ({belumUjianCount})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reloadData}
              disabled={loading}
              title="Segarkan data terbaru dari server"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50"
            >
              <RefreshCw size={15} className={cn(loading && "animate-spin text-emerald-600")} aria-hidden="true" />
              <span className="hidden sm:inline">{loading ? "Memuat..." : "Segarkan"}</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || sortedRows.length === 0}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <FileSpreadsheet size={16} aria-hidden="true" />
              <span>{exporting ? "Menyiapkan..." : "Unduh Excel"}</span>
            </button>
          </div>
        </div>

        {/* 4. INDIKATOR LOADING / SKELETON SAAT MEMUAT DATA */}
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 animate-spin">
              <RefreshCw size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Memuat hasil tes akademik siswa SMP...</p>
            <p className="text-xs text-slate-400">Menghubungkan ke server Al Fakhir</p>
          </div>
        ) : sortedRows.length === 0 ? (
          /* 5. KETIKA DATA TIDAK ADA (EMPTY STATE) */
          <div className="p-10 text-center">
            <EmptyState
              icon={Inbox}
              title={
                query || statusUjian !== "semua"
                  ? "Tidak ada siswa SMP yang cocok dengan filter"
                  : "Belum ada data tes akademik untuk periode ini"
              }
              description={
                query || statusUjian !== "semua"
                  ? "Coba ubah kata kunci pencarian atau ganti filter status ujian."
                  : "Calon siswa SMP pada periode ini belum ada yang menyelesaikan tes akademik online."
              }
              action={
                query || statusUjian !== "semua" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("")
                      setStatusUjian("semua")
                      setPeriod(PERIOD_ALL)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  >
                    Reset Semua Filter
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          /* 6. TABEL HASIL TES AKADEMIK SISWA SMP (KETIKA DATA SUDAH DI-ISI) */
          <div className="relative max-h-[68vh] overflow-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="h-11">
                  <th
                    scope="col"
                    className="sticky left-0 top-0 z-30 min-w-[200px] border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:min-w-[240px]"
                  >
                    Nama Siswa
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-20 min-w-[140px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Asal Sekolah
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-20 min-w-[120px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Status Ujian
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-20 min-w-[130px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-700"
                  >
                    Nilai Akhir
                  </th>
                  {SMP_AKADEMIK_MAPEL.map((mapel) => (
                    <th
                      key={mapel}
                      scope="col"
                      className="sticky top-0 z-20 min-w-[105px] border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600"
                    >
                      <span>{mapel}</span>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="sticky top-0 z-20 min-w-[110px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Keputusan
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-20 min-w-[80px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((r) => {
                  const isMine = ownerName && r.guru === ownerName
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "group transition-colors hover:bg-slate-50/80",
                        isMine && "bg-emerald-50/20"
                      )}
                    >
                      {/* Kolom Nama Siswa (Sticky Left) */}
                      <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-2.5 font-medium text-slate-900 group-hover:bg-slate-50">
                        <Link
                          href={`${detailBase}/${r.id}?unit=SMP`}
                          className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                        >
                          {r.nama}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span>TA {r.academicYear ?? "-"}</span>
                          <span>·</span>
                          <span>Gel. {r.gelombang}</span>
                          {r.guru && (
                            <>
                              <span>·</span>
                              <span className="text-slate-600">{r.guru}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Asal Sekolah */}
                      <td className="border-b border-slate-100 px-3 py-2.5 text-xs text-slate-600">
                        {r.asalSekolah || "-"}
                      </td>

                      {/* Status Ujian */}
                      <td className="border-b border-slate-100 px-3 py-2.5 text-center">
                        {r.sudahUjian ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            Sudah Ujian
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                            <Clock size={12} aria-hidden="true" />
                            Belum Ujian
                          </span>
                        )}
                      </td>

                      {/* Nilai Akhir & Predikat */}
                      <td className="border-b border-slate-100 px-3 py-2.5 text-center">
                        {r.totalScore !== null ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-base font-extrabold text-slate-900 tabular-nums">
                              {Math.round(r.totalScore)}
                            </span>
                            {r.grade && (
                              <span
                                className={cn(
                                  "inline-flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold shadow-xs",
                                  GRADE_PILL_CLASS[r.grade] ?? "bg-slate-100 text-slate-700"
                                )}
                              >
                                {r.grade}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Nilai per Mata Pelajaran */}
                      {SMP_AKADEMIK_MAPEL.map((mapel) => {
                        const score = r.subjectScores[mapel]
                        return (
                          <td key={mapel} className="border-b border-slate-100 px-2 py-2.5 text-center tabular-nums">
                            {score ? (
                              <div className="flex flex-col items-center">
                                <span
                                  className={cn(
                                    "font-semibold text-xs",
                                    score.percent >= 75
                                      ? "text-emerald-700"
                                      : score.percent >= 60
                                        ? "text-blue-700"
                                        : "text-amber-700"
                                  )}
                                >
                                  {score.percent}%
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {score.correct}/{score.total}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                        )
                      })}

                      {/* Keputusan */}
                      <td className="border-b border-slate-100 px-3 py-2.5 text-center text-xs">
                        {r.keputusan ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                              r.keputusan === "Terima"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : r.keputusan === "Tolak"
                                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                                  : "bg-amber-50 text-amber-700 ring-amber-200"
                            )}
                          >
                            {r.keputusan}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Tombol Aksi */}
                      <td className="border-b border-slate-100 px-3 py-2.5 text-center">
                        <Link
                          href={`${detailBase}/${r.id}?unit=SMP`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <span>Detail</span>
                          <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
