"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  GraduationCap,
  Sparkles,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SD_JUMLAH_INDIKATOR } from "@/lib/raport-sd"
import { cn } from "@/lib/utils"
import SdRaportForm from "../[candidateId]/sd-raport-form"

export interface CandidateItem {
  id: string
  name: string
  originSchool: string | null
  sdRaport: string | null
  academicYear: string | null
  gelombang: number
  filledCount: number
  isComplete: boolean
}

interface Props {
  candidates: CandidateItem[]
  observerName: string
}

export default function RaportSdPageClient({ candidates: initialCandidates, observerName }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramCandidateId = searchParams.get("candidateId")

  const [candidates, setCandidates] = useState<CandidateItem[]>(initialCandidates)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"semua" | "belum" | "sebagian" | "lengkap">("semua")

  // Siswa terpilih
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (paramCandidateId && initialCandidates.some((c) => c.id === paramCandidateId)) {
      return paramCandidateId
    }
    return initialCandidates[0]?.id ?? ""
  })

  // Sinkronkan jika query param berubah
  useEffect(() => {
    if (paramCandidateId && paramCandidateId !== selectedId && candidates.some((c) => c.id === paramCandidateId)) {
      setSelectedId(paramCandidateId)
    }
  }, [paramCandidateId, selectedId, candidates])

  // Filter daftar siswa
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      let matchStatus = true
      if (filterStatus === "belum") matchStatus = c.filledCount === 0
      else if (filterStatus === "sebagian") matchStatus = c.filledCount > 0 && !c.isComplete
      else if (filterStatus === "lengkap") matchStatus = c.isComplete
      return matchSearch && matchStatus
    })
  }, [candidates, search, filterStatus])

  // Siswa aktif saat ini
  const activeCandidate = useMemo(() => {
    return candidates.find((c) => c.id === selectedId) || candidates[0] || null
  }, [candidates, selectedId])

  // Indeks aktif dalam filtered list
  const activeIndexInFiltered = useMemo(() => {
    if (!activeCandidate) return -1
    return filteredCandidates.findIndex((c) => c.id === activeCandidate.id)
  }, [filteredCandidates, activeCandidate])

  // Statistik
  const stats = useMemo(() => {
    const total = candidates.length
    const lengkap = candidates.filter((c) => c.isComplete).length
    const sebagian = candidates.filter((c) => c.filledCount > 0 && !c.isComplete).length
    const belum = candidates.filter((c) => c.filledCount === 0).length
    return { total, lengkap, sebagian, belum }
  }, [candidates])

  // Ganti siswa terpilih dan perbarui URL query param
  const handleSelectCandidate = useCallback((id: string) => {
    setSelectedId(id)
    const url = new URL(window.location.href)
    url.searchParams.set("candidateId", id)
    window.history.replaceState({}, "", url.toString())
  }, [])

  // Callback setelah raport disimpan
  const handleSaved = useCallback((updated: { asalSekolah: string; sdRaportRaw: string; filledCount: number }) => {
    if (!activeCandidate) return
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === activeCandidate.id) {
          const isComplete = updated.filledCount === SD_JUMLAH_INDIKATOR
          return {
            ...c,
            originSchool: updated.asalSekolah,
            sdRaport: updated.sdRaportRaw,
            filledCount: updated.filledCount,
            isComplete,
          }
        }
        return c
      })
    )
  }, [activeCandidate])

  const prevCandidate = activeIndexInFiltered > 0 ? filteredCandidates[activeIndexInFiltered - 1] : null
  const nextCandidate =
    activeIndexInFiltered >= 0 && activeIndexInFiltered < filteredCandidates.length - 1
      ? filteredCandidates[activeIndexInFiltered + 1]
      : null

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <PageHeader
        title="Raport Observasi SD"
        description="Halaman khusus pengisian dan penilaian 20 indikator observasi calon siswa SD. Pilih nama siswa untuk mulai menilai."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/interviewer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Lihat Rekap Hasil
            </Link>
            <Link
              href="/interviewer/sd"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Daftar Siswa SD
            </Link>
          </div>
        }
      />

      {/* Ringkasan Statistik Progress Raport */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Users size={16} aria-hidden="true" />
            <span className="text-xs font-medium">Total Siswa SD</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span className="text-xs font-semibold">Lengkap (20 Indikator)</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">{stats.lengkap}</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle size={16} aria-hidden="true" />
            <span className="text-xs font-semibold">Sebagian Terisi</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">{stats.sebagian}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <HelpCircle size={16} aria-hidden="true" />
            <span className="text-xs font-medium">Belum Diisi</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-700">{stats.belum}</p>
        </div>
      </div>

      {/* Panel Pemilih Siswa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <label htmlFor="pilih-siswa-sd" className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap size={18} className="text-emerald-600" aria-hidden="true" />
              Pilih Calon Siswa SD yang Dinilai
            </label>
            <p className="text-xs text-slate-500">
              Ketik nama untuk mencari cepat, atau gunakan tombol Sebelumnya / Selanjutnya.
            </p>
          </div>

          {/* Navigasi Cepat Sebelumnya / Selanjutnya */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              disabled={!prevCandidate}
              onClick={() => prevCandidate && handleSelectCandidate(prevCandidate.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={prevCandidate ? `Sebelumnya: ${prevCandidate.name}` : "Sudah di awal"}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <span className="text-xs font-medium text-slate-500 px-1">
              {activeIndexInFiltered >= 0 ? `${activeIndexInFiltered + 1} / ${filteredCandidates.length}` : "-"}
            </span>

            <button
              type="button"
              disabled={!nextCandidate}
              onClick={() => nextCandidate && handleSelectCandidate(nextCandidate.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={nextCandidate ? `Selanjutnya: ${nextCandidate.name}` : "Sudah di akhir"}
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Input Pencarian & Filter Status */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama anak (contoh: Abbasy, Nuha, Jasmine...)"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 shrink-0">
            {(
              [
                { id: "semua", label: "Semua" },
                { id: "belum", label: "Belum Diisi" },
                { id: "sebagian", label: "Sebagian" },
                { id: "lengkap", label: "Lengkap" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap",
                  filterStatus === f.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector Dropdown Siswa */}
        <div className="space-y-1.5">
          <select
            id="pilih-siswa-sd"
            value={activeCandidate?.id || ""}
            onChange={(e) => handleSelectCandidate(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {filteredCandidates.length === 0 ? (
              <option value="" disabled>
                Tidak ada siswa yang cocok dengan pencarian
              </option>
            ) : (
              filteredCandidates.map((c) => {
                const statusTeks = c.isComplete
                  ? "[Lengkap 20/20]"
                  : c.filledCount > 0
                    ? `[${c.filledCount}/20 Terisi]`
                    : "[Belum Diisi]"
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} — {statusTeks} (Gelombang {c.gelombang})
                  </option>
                )
              })
            )}
          </select>
        </div>
      </div>

      {/* Kartu Informasi Calon Siswa yang Sedang Dinilai */}
      {activeCandidate && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 p-5 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                <Sparkles size={12} aria-hidden="true" />
                Unit SD
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Gelombang {activeCandidate.gelombang} · TA {activeCandidate.academicYear || "2027/2028"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{activeCandidate.name}</h2>
            <p className="text-xs text-slate-600">
              Asal TK/PAUD:{" "}
              <strong className="text-slate-800">{activeCandidate.originSchool || "Belum diisi"}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-slate-200 text-xs shadow-sm">
              <span className="font-medium text-slate-600">Status Raport:</span>
              {activeCandidate.isComplete ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 size={14} /> Lengkap ({activeCandidate.filledCount}/20)
                </span>
              ) : activeCandidate.filledCount > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                  <AlertCircle size={14} /> Terisi {activeCandidate.filledCount}/20
                </span>
              ) : (
                <span className="font-semibold text-slate-500">Belum Diisi (0/20)</span>
              )}
            </div>

            {/* Tombol pintas melihat jawaban formulir orang tua */}
            <Link
              href={`/interviewer/${activeCandidate.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
              title="Buka jawaban kuesioner orang tua siswa ini di tab baru"
            >
              Jawaban Orang Tua
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* Form Raport Observasi SD untuk Siswa yang Terpilih */}
      {activeCandidate ? (
        <SdRaportForm
          key={activeCandidate.id}
          candidateId={activeCandidate.id}
          candidateName={activeCandidate.name}
          initialAsalSekolah={activeCandidate.originSchool}
          initialSdRaport={activeCandidate.sdRaport}
          canEdit={true}
          onSaved={handleSaved}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <p className="text-base font-semibold text-slate-700">Tidak ada siswa yang dipilih</p>
          <p className="mt-1 text-sm">Pilih siswa di atas untuk mulai mengisi raport observasi.</p>
        </div>
      )}
    </div>
  )
}
