"use client"

import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useSyncExternalStore, Suspense } from "react"
import { BookOpen, CheckSquare, Table2, LayoutGrid } from "lucide-react"

type Unit = "SD" | "SMP"
const UNIT_KEY = "alfakhir_active_unit"

// Unit terakhir yang dipilih disimpan di sessionStorage agar menu tetap benar di halaman tanpa ?unit (mis. detail siswa dari Rekap).
const noopSubscribe = () => () => {}
const readStoredUnit = (): Unit | null => {
  const v = sessionStorage.getItem(UNIT_KEY)
  return v === "SD" || v === "SMP" ? v : null
}

function InterviewerNavContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const storedUnit = useSyncExternalStore(noopSubscribe, readStoredUnit, () => null)

  const paramUnit = searchParams?.get("unit")?.toUpperCase()
  const explicitUnit: Unit | null =
    pathname?.startsWith("/interviewer/sd") || paramUnit === "SD"
      ? "SD"
      : pathname?.startsWith("/interviewer/smp") || paramUnit === "SMP"
        ? "SMP"
        : null
  const currentUnit = pathname === "/interviewer" ? null : (explicitUnit ?? storedUnit)

  useEffect(() => {
    if (explicitUnit) sessionStorage.setItem(UNIT_KEY, explicitUnit)
    else if (pathname === "/interviewer") sessionStorage.removeItem(UNIT_KEY)
  }, [explicitUnit, pathname])

  // Pada halaman utama pemilihan unit (/interviewer), navbar bersih tanpa tombol unit
  if (!pathname || pathname === "/interviewer" || !currentUnit) {
    return null
  }

  // Ketika Unit SD dipilih: HANYA tampilkan menu SD, SMP sama sekali TIDAK muncul
  if (currentUnit === "SD") {
    return (
      <div className="flex w-max items-center gap-2">
        <Link
          href="/interviewer"
          title="Kembali ke Pemilihan Unit"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LayoutGrid size={14} aria-hidden="true" />
          <span>Pilih Unit</span>
        </Link>

        <div
          role="group"
          aria-label="Unit SD"
          className="flex items-center gap-1 rounded-xl border border-orange-500/40 bg-orange-500/15 p-1"
        >
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 text-xs font-bold text-orange-300 border-r border-orange-500/30 mr-0.5">
            <span className="h-2 w-2 rounded-full bg-orange-400" aria-hidden="true" />
            UNIT SD
          </span>
          <Link
            href="/interviewer/sd"
            title="Daftar Siswa & Koreksi Observasi SD"
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              pathname === "/interviewer/sd"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <CheckSquare size={13} aria-hidden="true" />
            <span>Koreksi SD</span>
          </Link>
          <Link
            href="/interviewer/quran?unit=SD"
            title="Observasi Al-Qur'an Calon Siswa SD"
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              pathname === "/interviewer/quran" && currentUnit === "SD"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <BookOpen size={13} aria-hidden="true" />
            <span>Al-Qur&apos;an SD</span>
          </Link>
          <Link
            href="/interviewer/rekap?unit=SD"
            title="Rekap Hasil Observasi & Raport SD"
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              pathname === "/interviewer/rekap" && currentUnit === "SD"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Table2 size={13} aria-hidden="true" />
            <span>Rekap SD</span>
          </Link>
        </div>
      </div>
    )
  }

  // Ketika Unit SMP dipilih: HANYA tampilkan menu SMP, SD sama sekali TIDAK muncul
  return (
    <div className="flex w-max items-center gap-2">
      <Link
        href="/interviewer"
        title="Kembali ke Pemilihan Unit"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LayoutGrid size={14} aria-hidden="true" />
        <span>Pilih Unit</span>
      </Link>

      <div
        role="group"
        aria-label="Unit SMP"
        className="flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-1"
      >
        <span className="hidden md:inline-flex items-center gap-1.5 px-2 text-xs font-bold text-emerald-300 border-r border-emerald-500/30 mr-0.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          UNIT SMP
        </span>
        <Link
          href="/interviewer/smp"
          title="Daftar Siswa & Koreksi Wawancara SMP"
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
            pathname === "/interviewer/smp"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          <CheckSquare size={13} aria-hidden="true" />
          <span>Koreksi SMP</span>
        </Link>
        <Link
          href="/interviewer/quran?unit=SMP"
          title="Observasi Al-Qur'an Calon Siswa SMP"
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
            pathname === "/interviewer/quran" && currentUnit === "SMP"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          <BookOpen size={13} aria-hidden="true" />
          <span>Al-Qur&apos;an SMP</span>
        </Link>
        <Link
          href="/interviewer/rekap?unit=SMP"
          title="Rekap Hasil Wawancara & Akademik SMP"
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
            pathname === "/interviewer/rekap" && currentUnit === "SMP"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Table2 size={13} aria-hidden="true" />
          <span>Rekap SMP</span>
        </Link>
      </div>
    </div>
  )
}

export function InterviewerNav() {
  return (
    <Suspense fallback={null}>
      <InterviewerNavContent />
    </Suspense>
  )
}
