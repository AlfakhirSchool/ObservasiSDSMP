"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, ClipboardList, GraduationCap, Home, Users } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { RekapFormClient } from "@/components/rekap-form-client"
import { RekapSdClient } from "@/components/rekap-sd-client"
import { startPolling } from "@/lib/polling"
import type { RekapFormData, RekapJenjang } from "@/lib/rekap-form"
import type { RekapSdRow } from "@/lib/rekap-sd"
import { cn } from "@/lib/utils"

type Sumber = "orangtua" | "siswa" | "raport"

/** Sumber data yang tersedia tiap jenjang: SD = orang tua + raport observasi; SMP = orang tua + siswa. */
const SUMBER: Record<RekapJenjang, { id: Sumber; label: string }[]> = {
  SD: [
    { id: "orangtua", label: "Jawaban orang tua" },
    { id: "raport", label: "Raport observasi" },
  ],
  SMP: [
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
  /** Nama pewawancara yang sedang login; kosong untuk admin. */
  ownerName?: string
  detailBase: string
  /** Jenjang yang dibuka pertama kali (mis. jenjang tempat pewawancara paling banyak punya siswa). */
  initialJenjang?: RekapJenjang
}

export function RekapHasil({ sdRaport, sdOrangTua, smpOrangTua, smpSiswa, ownerName, detailBase, initialJenjang = "SD" }: Props) {
  const router = useRouter()
  const isAdmin = !ownerName
  const homeHref = isAdmin ? "/admin" : "/interviewer/sd"
  const [jenjang, setJenjang] = useState<RekapJenjang>(initialJenjang)
  const [sumber, setSumber] = useState<Sumber>("orangtua")

  // Guru mengisi sepanjang hari; segarkan data berkala (berhenti saat tab tersembunyi).
  useEffect(() => startPolling(() => router.refresh(), 30_000), [router])

  const pilihJenjang = (j: RekapJenjang) => {
    setJenjang(j)
    setSumber("orangtua")
  }

  const quickLinks = [
    { href: "/interviewer/raport-sd", label: "Isi Raport SD", desc: "Nilai 20 indikator per anak", icon: ClipboardList, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
    { href: "/interviewer/sd", label: "Daftar Siswa SD", desc: "Catatan observasi SD", icon: Users, tone: "bg-orange-50 text-orange-700 ring-orange-200" },
    { href: "/interviewer/smp", label: "Daftar Siswa SMP", desc: "Catatan wawancara SMP", icon: GraduationCap, tone: "bg-teal-50 text-teal-700 ring-teal-200" },
  ]

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
        title="Rekap Hasil"
        description="Satu baris per siswa, satu kolom per pertanyaan atau indikator. Bisa difilter, dicari, dan diunduh ke Excel."
      />

      {/* Menu cepat */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {/* Pilihan tabel */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-6">
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
      ) : sumber === "siswa" ? (
        <RekapFormClient key="smp-siswa" data={smpSiswa} pengisi="siswa" ownerName={ownerName} detailBase={detailBase} />
      ) : (
        <RekapFormClient key="smp-orangtua" data={smpOrangTua} pengisi="orang tua" ownerName={ownerName} detailBase={detailBase} />
      )}
    </div>
  )
}
