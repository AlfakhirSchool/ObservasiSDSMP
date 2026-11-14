"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, ChevronRight, GraduationCap, Home, Users, Award } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { RekapFormClient } from "@/components/rekap-form-client"
import { RekapSdClient } from "@/components/rekap-sd-client"
import { RekapAkademikClient } from "@/components/rekap-akademik-client"
import { startPolling } from "@/lib/polling"
import type { RekapFormData, RekapJenjang } from "@/lib/rekap-form"
import type { RekapSdRow } from "@/lib/rekap-sd"
import type { RekapAkademikSmpRow } from "@/lib/rekap-akademik"
import { cn } from "@/lib/utils"

type Sumber = "orangtua" | "siswa" | "raport" | "akademik"

/** Sumber data yang tersedia tiap jenjang: SD = orang tua + raport observasi; SMP = orang tua + siswa. */
const SUMBER: Record<RekapJenjang, { id: Sumber; label: string }[]> = {
  SD: [
    { id: "orangtua", label: "Jawaban orang tua" },
  ],
  SMP: [
    { id: "akademik", label: "Hasil Tes Akademik" },
    { id: "orangtua", label: "Jawaban orang tua" },
    { id: "siswa", label: "Jawaban siswa" },
  ],
}

const TAB_BASE =
  "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

interface Props {
  sdRaport: RekapSdRow[]
  sdOrangTua: RekapFormData
  smpOrangTua: RekapFormData
  smpSiswa: RekapFormData
  smpAkademik?: RekapAkademikSmpRow[]
  /** Nama pewawancara yang sedang login; kosong untuk admin. */
  ownerName?: string
  detailBase: string
  /** Jenjang yang dibuka pertama kali (mis. jenjang tempat pewawancara paling banyak punya siswa). */
  initialJenjang?: RekapJenjang
  /** Kunci tampilan ke satu unit saja (SD atau SMP). Pilihan jenjang lain dan link unit lain akan disembunyikan. */
  lockedUnit?: RekapJenjang
  initialSumber?: Sumber
}
export function RekapHasil({
  sdRaport,
  sdOrangTua,
  smpOrangTua,
  smpSiswa,
  smpAkademik = [],
  ownerName,
  detailBase,
  initialJenjang = "SD",
  lockedUnit,
  initialSumber,
}: Props) {
  const router = useRouter()
  const isAdmin = !ownerName
  const activeJenjang = lockedUnit ?? initialJenjang
  const homeHref = isAdmin ? "/admin" : lockedUnit === "SD" ? "/interviewer/sd" : lockedUnit === "SMP" ? "/interviewer/smp" : "/interviewer"
  const [jenjang, setJenjang] = useState<RekapJenjang>(activeJenjang)
  const [sumber, setSumber] = useState<Sumber>(
    initialSumber ?? (activeJenjang === "SMP" ? "akademik" : "orangtua")
  )
  // Guru mengisi sepanjang hari; segarkan data berkala (berhenti saat tab tersembunyi).
  useEffect(() => startPolling(() => router.refresh(), 30_000), [router])

  const pilihJenjang = (j: RekapJenjang) => {
    setJenjang(j)
    setSumber("orangtua")
  }

  const allQuickLinks = [
    { unit: "SD", href: "/interviewer/sd", label: "Koreksi Unit SD", desc: "Observasi & kuesioner siswa SD", icon: Users, tone: "bg-orange-50 text-orange-800 ring-orange-200" },
    { unit: "SD", href: "/interviewer/quran?unit=SD", label: "Al-Qur'an SD", desc: "Tes baca Al-Qur'an siswa SD", icon: BookOpen, tone: "bg-orange-50 text-orange-800 ring-orange-200" },
    { unit: "SMP", href: "/interviewer/smp", label: "Koreksi Unit SMP", desc: "Wawancara calon siswa SMP", icon: GraduationCap, tone: "bg-teal-50 text-teal-800 ring-teal-200" },
    { unit: "SMP", href: "/interviewer/quran?unit=SMP", label: "Al-Qur'an SMP", desc: "Tes baca Al-Qur'an siswa SMP", icon: BookOpen, tone: "bg-teal-50 text-teal-800 ring-teal-200" },
    { unit: "SMP", href: "/interviewer/rekap?unit=SMP&sumber=akademik", label: "Tes Akademik SMP", desc: "Rekap nilai tes akademik online SMP", icon: Award, tone: "bg-teal-50 text-teal-800 ring-teal-200" },
  ]
  const quickLinks = lockedUnit ? allQuickLinks.filter((l) => l.unit === lockedUnit) : allQuickLinks

  return (
    <div className="space-y-6">
      {/* Navigasi: kembali + jejak halaman */}
      <nav aria-label="Navigasi" className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push(homeHref))}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        <Link href={homeHref} className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-emerald-700">
          <Home size={15} aria-hidden="true" />
          {isAdmin ? "Dashboard Admin" : "Daftar Siswa"}
        </Link>
        <ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
        <span className="font-semibold text-slate-900">Rekap Hasil</span>
      </nav>

      <PageHeader
        title={lockedUnit ? `Rekap Hasil — Unit ${lockedUnit}` : "Rekap Hasil"}
        description={
          lockedUnit
            ? `Hasil kuesioner dan observasi khusus calon siswa ${lockedUnit}.`
            : "Satu baris per siswa, satu kolom per pertanyaan atau indikator. Bisa difilter, dicari, dan diunduh ke Excel."
        }
      />

      {/* Menu cepat pemisahan koreksi SD vs SMP */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Pilihan Menu Koreksi (SD & SMP Terpisah):
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ href, label, desc, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", tone)}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{label}</span>
                <span className="block truncate text-xs text-slate-500">{desc}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      {/* Pilihan tabel */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-6">
        {!lockedUnit && (
          <>
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:w-auto">Jenjang</span>
              <div role="tablist" aria-label="Jenjang" className="inline-flex rounded-xl bg-slate-100 p-1">
                {(["SD", "SMP"] as const).map((j) => (
                  <button
                    key={j}
                    type="button"
                    role="tab"
                    aria-selected={jenjang === j}
                    onClick={() => pilihJenjang(j)}
                    className={cn(TAB_BASE, jenjang === j ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>
            <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
          </>
        )}
        <div className="flex items-center gap-3">
          <span className="w-16 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:w-auto">Data</span>
          <div role="tablist" aria-label="Sumber data" className="inline-flex rounded-xl bg-slate-100 p-1">
            {SUMBER[jenjang].map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={sumber === s.id}
                onClick={() => setSumber(s.id)}
                className={cn(TAB_BASE, sumber === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {jenjang === "SD" && sumber === "raport" ? (
        <RekapSdClient key="sd-raport" rows={sdRaport} ownerName={ownerName} detailBase={detailBase} />
      ) : jenjang === "SD" ? (
        <RekapFormClient key="sd-orangtua" data={sdOrangTua} pengisi="orang tua" ownerName={ownerName} detailBase={detailBase} isSd />
      ) : sumber === "akademik" ? (
        <RekapAkademikClient key="smp-akademik" initialRows={smpAkademik} ownerName={ownerName} detailBase={detailBase} />
      ) : sumber === "siswa" ? (
        <RekapFormClient key="smp-siswa" data={smpSiswa} pengisi="siswa" ownerName={ownerName} detailBase={detailBase} />
      ) : (
        <RekapFormClient key="smp-orangtua" data={smpOrangTua} pengisi="orang tua" ownerName={ownerName} detailBase={detailBase} />
      )}
    </div>
  )
}
