"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Download, Home, Save, Search } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"
import {
  QURAN_CATATAN_MAKS,
  QURAN_NILAI_KETERANGAN,
  QURAN_NILAI_TONE,
  QURAN_NILAI_URUT,
  type QuranNilai,
} from "@/lib/quran"
import { eksporRekapQuran } from "@/lib/rekap-excel"

export interface QuranRow {
  id: string
  nama: string
  level: "SD" | "SMP"
  gelombang: number
  academicYear: string | null
  nilai: QuranNilai | null
  catatan: string
  dinilaiOleh: string
}

interface Props {
  rows: QuranRow[]
  activeUnit: "SD" | "SMP"
  homeHref: string
  isAdmin: boolean
}

type Status = "semua" | "belum" | "sudah"

const TAB_BASE =
  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

function NilaiBadge({ nilai }: { nilai: QuranNilai | null }) {
  if (!nilai) return <span className="text-xs text-slate-300">–</span>
  return (
    <span className={cn("inline-block min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold ring-1 ring-inset", QURAN_NILAI_TONE[nilai])}>
      {nilai}
    </span>
  )
}

export default function QuranPageClient({ rows: initialRows, activeUnit, homeHref, isAdmin }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [status, setStatus] = useState<Status>("semua")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Daftar unik Tahun Masuk / Tahun Ajaran
  const years = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      if (r.academicYear) set.add(r.academicYear)
    }
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [rows])

  // Default: tahun ajaran terbaru
  const [selectedYear, setSelectedYear] = useState<string>(() => years[0] ?? "SEMUA")

  // Daftar unik Gelombang yang tersedia untuk tahun yang dipilih
  const availableWaves = useMemo(() => {
    const set = new Set<number>()
    for (const r of rows) {
      if (selectedYear === "SEMUA" || r.academicYear === selectedYear) {
        set.add(r.gelombang)
      }
    }
    return [...set].sort((a, b) => a - b)
  }, [rows, selectedYear])

  // Filter gelombang terpisah (default: Semua Gelombang pada tahun tersebut)
  const [selectedWave, setSelectedWave] = useState<string>("SEMUA")

  const [nilai, setNilai] = useState<QuranNilai | null>(null)
  const [catatan, setCatatan] = useState("")
  const [saving, setSaving] = useState(false)

  // Filter siswa sesuai Tahun, Gelombang, Status, dan Pencarian
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (selectedYear !== "SEMUA" && r.academicYear !== selectedYear) return false
      if (selectedWave !== "SEMUA" && r.gelombang !== Number(selectedWave)) return false
      if (status === "belum" && r.nilai !== null) return false
      if (status === "sudah" && r.nilai === null) return false
      if (q && !r.nama.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, selectedYear, selectedWave, status, query])

  // Grouping per Tahun untuk tampilan dropdown / accordion collapsible jika semua tahun ditampilkan
  const groupedYears = useMemo(() => {
    const map = new Map<string, QuranRow[]>()
    for (const r of visible) {
      const y = r.academicYear ?? "Lainnya"
      const arr = map.get(y) ?? []
      arr.push(r)
      map.set(y, arr)
    }
    return Array.from(map.entries())
  }, [visible])

  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>({})
  const toggleYear = (yr: string) => {
    setCollapsedYears((prev) => ({ ...prev, [yr]: !prev[yr] }))
  }

  const active = rows.find((r) => r.id === selectedId) ?? null
  const dirty = active !== null && (nilai !== active.nilai || catatan.trim() !== active.catatan)
  // Statistik dihitung berdasarkan siswa dalam Tahun & Gelombang yang sedang dipilih
  const scopedByPeriod = useMemo(() => {
    return rows.filter((r) => {
      if (selectedYear !== "SEMUA" && r.academicYear !== selectedYear) return false
      if (selectedWave !== "SEMUA" && r.gelombang !== Number(selectedWave)) return false
      return true
    })
  }, [rows, selectedYear, selectedWave])

  const sudah = scopedByPeriod.filter((r) => r.nilai !== null).length
  const dist = QURAN_NILAI_URUT.map((n) => scopedByPeriod.filter((r) => r.nilai === n).length)

  const pilih = (r: QuranRow) => {
    if (dirty && !confirm("Perubahan belum disimpan. Pindah siswa tanpa menyimpan?")) return
    setSelectedId(r.id)
    setNilai(r.nilai)
    setCatatan(r.catatan)
    // Di HP form berada di bawah daftar: geser otomatis agar langsung terlihat
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => document.getElementById("form-penilaian-quran")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

  const simpan = async (lanjut: boolean) => {
    if (!active) return
    setSaving(true)
    try {
      const res = await fetch("/api/quran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: active.id, nilai, catatan: catatan.trim() }),
      })
      const data: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan")

      const updated = rows.map((r) => (r.id === active.id ? { ...r, nilai, catatan: catatan.trim() } : r))
      setRows(updated)
      toast.success(`Tersimpan: ${active.nama}`)
      router.refresh()

      if (lanjut) {
        const idx = visible.findIndex((r) => r.id === active.id)
        const berikut = visible.slice(idx + 1).find((r) => r.id !== active.id)
        if (berikut) {
          const terbaru = updated.find((r) => r.id === berikut.id) ?? berikut
          setSelectedId(terbaru.id)
          setNilai(terbaru.nilai)
          setCatatan(terbaru.catatan)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const switchUnit = (u: "SD" | "SMP") => {
    if (dirty && !confirm("Perubahan belum disimpan. Pindah unit tanpa menyimpan?")) return
    router.push(`/interviewer/quran?unit=${u}`)
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Navigasi" className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={homeHref} className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-emerald-700">
          <Home size={15} aria-hidden="true" />
          {isAdmin ? "Dashboard Admin" : activeUnit === "SD" ? "Koreksi SD" : "Koreksi SMP"}
        </Link>
        <ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
        <span className="font-semibold text-slate-900">Observasi Al-Qur&apos;an {activeUnit}</span>
      </nav>

      <PageHeader
        title={`Observasi Al-Qur'an — Unit ${activeUnit}`}
        description={`Penilaian tes baca 2 halaman khusus siswa ${activeUnit}. Filter Tahun Masuk dan Gelombang dipisahkan ke dropdown masing-masing.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Pilihan Jenjang / Unit Terpisah */}
            <div role="tablist" aria-label="Pilih Unit" className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeUnit === "SD"}
                onClick={() => switchUnit("SD")}
                className={cn(
                  TAB_BASE,
                  activeUnit === "SD"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Unit SD
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeUnit === "SMP"}
                onClick={() => switchUnit("SMP")}
                className={cn(
                  TAB_BASE,
                  activeUnit === "SMP"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Unit SMP
              </button>
            </div>

            <button
              type="button"
              onClick={() => eksporRekapQuran(visible)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download size={16} aria-hidden="true" />
              Unduh Excel
            </button>
          </div>
        }
      />

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatCard label="Sudah dinilai" value={`${sudah}/${scopedByPeriod.length}`} icon={CheckCircle2} tone="emerald" />
        {QURAN_NILAI_URUT.map((n, i) => (
          <StatCard
            key={n}
            label={`Nilai ${n}`}
            value={dist[i]}
            icon={BookOpen}
            tone={n === "A" ? "emerald" : n === "B" ? "amber" : "slate"}
            hint={QURAN_NILAI_KETERANGAN[n]}
          />
        ))}
        <StatCard label="Belum dinilai" value={scopedByPeriod.length - sudah} icon={BookOpen} tone="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Kolom Kiri: Toolbar Filter & Daftar Siswa */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Baris Filter: Cari, Status, dan 2 Dropdown Terpisah (Tahun & Gelombang) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Cari nama siswa ${activeUnit}...`}
                  aria-label={`Cari nama siswa ${activeUnit}`}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Status Penilaian */}
              <div role="tablist" aria-label="Status Nilai" className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
                {(
                  [
                    { id: "semua", label: "Semua" },
                    { id: "belum", label: "Belum" },
                    { id: "sudah", label: "Sudah" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={status === s.id}
                    onClick={() => setStatus(s.id)}
                    className={cn(
                      TAB_BASE,
                      status === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dua Dropdown Terpisah: 1) Tahun Masuk, 2) Gelombang */}
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="filter-tahun" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tahun Masuk / TA
                </label>
                <select
                  id="filter-tahun"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value)
                    setSelectedWave("SEMUA")
                    setSelectedId(null)
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                >
                  {years.map((y, idx) => (
                    <option key={y} value={y}>
                      TA {y} {idx === 0 ? "(Terbaru)" : ""}
                    </option>
                  ))}
                  <option value="SEMUA">Semua Tahun</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="filter-gelombang" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gelombang
                </label>
                <select
                  id="filter-gelombang"
                  value={selectedWave}
                  onChange={(e) => {
                    setSelectedWave(e.target.value)
                    setSelectedId(null)
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="SEMUA">Semua Gelombang</option>
                  {availableWaves.map((w) => (
                    <option key={w} value={String(w)}>
                      Gelombang {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Tidak ada siswa {activeUnit} yang cocok dengan filter yang dipilih.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-100">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-3 py-2">Nama Siswa</th>
                    <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-3 py-2">Tahun Masuk</th>
                    <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-3 py-2">Gelombang</th>
                    <th scope="col" className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-center">Nilai</th>
                    <th scope="col" className="sticky top-0 z-10 hidden bg-slate-50 px-3 py-2 sm:table-cell">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedYear !== "SEMUA" ? (
                    visible.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => pilih(r)}
                        className={cn(
                          "cursor-pointer hover:bg-slate-50",
                          r.id === selectedId && "bg-emerald-50/60 font-semibold"
                        )}
                      >
                        <td className="border-t border-slate-100 px-3 py-2">
                          <button
                            type="button"
                            aria-current={r.id === selectedId}
                            className="text-left text-slate-900 focus-visible:outline-none focus-visible:underline"
                          >
                            {r.nama}
                          </button>
                        </td>
                        <td className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {r.academicYear ?? "-"}
                        </td>
                        <td className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                          Gelombang {r.gelombang}
                        </td>
                        <td className="border-t border-slate-100 px-3 py-2 text-center">
                          <NilaiBadge nilai={r.nilai} />
                        </td>
                        <td
                          className="hidden max-w-[200px] truncate border-t border-slate-100 px-3 py-2 text-xs text-slate-500 sm:table-cell"
                          title={r.catatan || undefined}
                        >
                          {r.catatan || "–"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    groupedYears.map(([yearName, yearRows]) => {
                      const isCollapsed = !!collapsedYears[yearName]
                      return (
                        <Fragment key={yearName}>
                          <tr className="bg-slate-100/90 font-semibold text-slate-800">
                            <td colSpan={5} className="border-t border-slate-200 px-3 py-2">
                              <button
                                type="button"
                                onClick={() => toggleYear(yearName)}
                                className="flex w-full items-center justify-between text-left hover:text-emerald-700"
                              >
                                <span className="flex items-center gap-2">
                                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                  <span>Tahun Masuk / TA {yearName}</span>
                                </span>
                                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 shadow-sm border border-slate-200">
                                  {yearRows.length} Siswa {isCollapsed ? "(Klik untuk membuka)" : "(Klik untuk melipat)"}
                                </span>
                              </button>
                            </td>
                          </tr>
                          {!isCollapsed &&
                            yearRows.map((r) => (
                              <tr
                                key={r.id}
                                onClick={() => pilih(r)}
                                className={cn(
                                  "cursor-pointer hover:bg-slate-50",
                                  r.id === selectedId && "bg-emerald-50/60 font-semibold"
                                )}
                              >
                                <td className="border-t border-slate-100 px-3 py-2">
                                  <button
                                    type="button"
                                    aria-current={r.id === selectedId}
                                    className="text-left text-slate-900 focus-visible:outline-none focus-visible:underline"
                                  >
                                    {r.nama}
                                  </button>
                                </td>
                                <td className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                                  {r.academicYear ?? "-"}
                                </td>
                                <td className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                                  Gelombang {r.gelombang}
                                </td>
                                <td className="border-t border-slate-100 px-3 py-2 text-center">
                                  <NilaiBadge nilai={r.nilai} />
                                </td>
                                <td
                                  className="hidden max-w-[200px] truncate border-t border-slate-100 px-3 py-2 text-xs text-slate-500 sm:table-cell"
                                  title={r.catatan || undefined}
                                >
                                  {r.catatan || "–"}
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Form Penilaian Siswa Terpilih */}
        <div id="form-penilaian-quran" className="h-fit scroll-mt-32 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          {active ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Unit {active.level} · Gelombang {active.gelombang}
                  {active.academicYear ? ` · TA ${active.academicYear}` : ""}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{active.nama}</h2>
                {active.dinilaiOleh && <p className="text-xs text-slate-500">Terakhir dinilai oleh: {active.dinilaiOleh}</p>}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Nilai tes baca (2 halaman)</p>
                <div role="group" aria-label="Nilai Al-Qur'an" className="grid grid-cols-3 gap-2">
                  {QURAN_NILAI_URUT.map((n) => {
                    const aktif = nilai === n
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={aktif}
                        onClick={() => setNilai(aktif ? null : n)}
                        className={cn(
                          "min-h-12 rounded-xl border text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                          aktif ? QURAN_NILAI_TONE[n] : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
                <ul className="space-y-0.5 text-xs text-slate-500">
                  {QURAN_NILAI_URUT.map((n) => (
                    <li key={n}>
                      <span className="font-semibold text-slate-700">{n}</span> : {QURAN_NILAI_KETERANGAN[n]}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quran-catatan" className="text-sm font-medium text-slate-700">Catatan penguji</label>
                <textarea
                  id="quran-catatan"
                  value={catatan}
                  maxLength={QURAN_CATATAN_MAKS}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan bacaan, tajwid, atau kelancaran siswa"
                  className="min-h-[100px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => simpan(false)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} aria-hidden="true" />
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => simpan(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Simpan &amp; berikutnya
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Pilih salah satu siswa di daftar untuk mulai menilai.</p>
          )}
        </div>
      </div>
    </div>
  )
}
