"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"
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
  const [jenjang, setJenjang] = useState<RekapJenjang>(initialJenjang)
  const [sumber, setSumber] = useState<Sumber>("orangtua")

  // Guru mengisi sepanjang hari; segarkan data berkala (berhenti saat tab tersembunyi).
  useEffect(() => startPolling(() => router.refresh(), 30_000), [router])

  const pilihJenjang = (j: RekapJenjang) => {
    setJenjang(j)
    setSumber("orangtua")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekap Hasil"
        description="Hasil semua siswa dalam bentuk tabel seperti Excel: satu baris per nama, satu kolom per pertanyaan atau indikator."
        actions={
          ownerName ? (
            <>
              <span className="text-sm font-medium text-slate-500">Isi catatan observasi:</span>
              {(["SD", "SMP"] as const).map((j) => (
                <Link
                  key={j}
                  href={`/interviewer/${j.toLowerCase()}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-400 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                >
                  <ClipboardList size={16} aria-hidden="true" />
                  Unit {j}
                </Link>
              ))}
            </>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Jenjang" className="inline-flex self-start rounded-xl bg-slate-100 p-1">
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
        <div role="tablist" aria-label="Sumber data" className="inline-flex self-start rounded-xl bg-slate-100 p-1">
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
