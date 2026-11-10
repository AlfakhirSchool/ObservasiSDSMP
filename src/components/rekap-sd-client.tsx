"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, CircleDashed, Clock, Table2, Users } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { RekapToolbar, cocokStatus, milikSayaDulu, type StatusFilter } from "@/components/rekap-toolbar"
import { StatCard } from "@/components/ui/stat-card"
import { filterByPeriod, listPeriods, periodeAwalBerisi, type PeriodFilterValue } from "@/lib/period"
import { SD_ASPEK, SD_JUMLAH_INDIKATOR, aspekPredikat } from "@/lib/raport-sd"
import type { RekapSdRow } from "@/lib/rekap-sd"
import { cn } from "@/lib/utils"
import { eksporRekapSd } from "@/lib/rekap-excel"

/** Warna judul tiap kelompok aspek, supaya kolom mudah dikenali saat digulir. */
const ASPEK_TONE = {
  kognitif: "bg-sky-50 text-sky-800",
  motorikHalus: "bg-violet-50 text-violet-800",
  motorikKasar: "bg-orange-50 text-orange-800",
  quran: "bg-emerald-50 text-emerald-800",
} as const

const KEPUTUSAN_TONE: Record<string, string> = {
  Terima: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Pertimbangkan: "bg-amber-50 text-amber-700 ring-amber-200",
  Tolak: "bg-rose-50 text-rose-700 ring-rose-200",
}

interface Props {
  rows: RekapSdRow[]
  /** Nama pewawancara yang sedang login. Bila diisi, hanya siswa dengan guru ini yang bisa dibuka detailnya. */
  ownerName?: string
  /** Awal alamat halaman detail siswa, mis. "/admin/candidates". */
  detailBase: string
}

export function RekapSdClient({ rows, ownerName, detailBase }: Props) {
  const [period, setPeriod] = useState<PeriodFilterValue>(() => periodeAwalBerisi(rows, (r) => r.terisi > 0))
  const [guru, setGuru] = useState("")
  const [status, setStatus] = useState<StatusFilter>("semua")
  const [query, setQuery] = useState("")

  const periods = useMemo(() => listPeriods(rows), [rows])
  const inPeriod = useMemo(() => filterByPeriod(rows, period, periods), [rows, period, periods])
  const gurus = useMemo(() => [...new Set(inPeriod.map((r) => r.guru).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [inPeriod])
  const scoped = useMemo(() => (guru ? inPeriod.filter((r) => r.guru === guru) : inPeriod), [inPeriod, guru])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cocok = scoped.filter(
      (r) => (!q || r.nama.toLowerCase().includes(q) || r.asalSekolah.toLowerCase().includes(q)) && cocokStatus(r.terisi, SD_JUMLAH_INDIKATOR, status)
    )
    return milikSayaDulu(cocok, ownerName)
  }, [scoped, query, status, ownerName])

  const lengkap = scoped.filter((r) => r.terisi === SD_JUMLAH_INDIKATOR).length
  const belum = scoped.filter((r) => r.terisi === 0).length
  const sebagian = scoped.length - lengkap - belum

  /** Persentase "Berkembang" per indikator di antara siswa yang sudah dinilai (baris bawah tabel). */
  const persen = (kode: string) => {
    const dinilai = visible.filter((r) => r.nilai[kode] !== undefined)
    if (dinilai.length === 0) return null
    return { pct: Math.round((dinilai.filter((r) => r.nilai[kode] === "baik").length / dinilai.length) * 100), n: dinilai.length }
  }

  const fixedCols = 4
  /** Untuk jenjang SD, semua guru observer boleh membuka detail dan raport setiap siswa SD. */
  const canOpen = (_r: RekapSdRow) => true

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Siswa" value={scoped.length} icon={Users} tone="blue" />
        <StatCard label="Lengkap" value={lengkap} icon={CheckCircle2} tone="emerald" hint={`${SD_JUMLAH_INDIKATOR} dari ${SD_JUMLAH_INDIKATOR} indikator`} />
        <StatCard label="Sebagian" value={sebagian} icon={Clock} tone="amber" hint="Belum semua dinilai" />
        <StatCard label="Belum diisi" value={belum} icon={CircleDashed} tone="slate" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <RekapToolbar
          periods={periods}
          period={period}
          onPeriod={setPeriod}
          query={query}
          onQuery={setQuery}
          gurus={gurus}
          guru={guru}
          onGuru={setGuru}
          status={status}
          onStatus={setStatus}
          searchLabel="Cari nama atau asal sekolah"
          onExport={() => eksporRekapSd(visible)}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 font-bold text-emerald-700">✓</span>
            Berkembang (Al-Qur&apos;an: Berkembang Baik)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 font-bold text-amber-700">!</span>
            Belum Berkembang (Al-Qur&apos;an: Berkembang)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded text-slate-300">–</span>
            Belum dinilai
          </span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Table2}
            title={rows.length === 0 ? "Belum ada siswa SD" : "Tidak ada siswa yang cocok"}
            description={rows.length === 0 ? "Siswa SD akan muncul di sini setelah ditambahkan." : "Coba ubah kata kunci atau filter."}
          />
        ) : (
          <div className="relative max-h-[68vh] overflow-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="h-10">
                  <th scope="col" rowSpan={2} className="sticky left-0 top-0 z-30 min-w-[160px] border-b border-r border-slate-200 bg-slate-50 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:min-w-[220px]">
                    Nama
                  </th>
                  <th scope="col" rowSpan={2} className="sticky top-0 z-20 min-w-[150px] border-b border-slate-200 bg-slate-50 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Guru
                  </th>
                  <th scope="col" rowSpan={2} className="sticky top-0 z-20 min-w-[130px] border-b border-slate-200 bg-slate-50 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Asal sekolah
                  </th>
                  <th scope="col" rowSpan={2} className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gel.
                  </th>
                  {SD_ASPEK.map((a) => (
                    <th
                      key={a.id}
                      scope="colgroup"
                      colSpan={a.indikator.length + 1}
                      className={cn("sticky top-0 z-20 border-b border-l border-slate-200 px-3 text-center text-xs font-bold", ASPEK_TONE[a.id])}
                    >
                      {a.judul.id}
                    </th>
                  ))}
                  <th scope="col" rowSpan={2} className="sticky top-0 z-20 min-w-[84px] border-b border-l border-slate-200 bg-slate-50 px-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Terisi
                  </th>
                  <th scope="col" rowSpan={2} className="sticky top-0 z-20 min-w-[120px] border-b border-slate-200 bg-slate-50 px-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Keputusan
                  </th>
                </tr>
                <tr>
                  {SD_ASPEK.map((a) => (
                    <HeaderIndikator key={a.id} aspekId={a.id} items={a.indikator.map((i) => i.teks.id)} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="group">
                    <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-2 group-hover:bg-slate-50">
                      {canOpen(r) ? (
                        <Link href={`${detailBase}/${r.id}`} className="font-medium text-slate-900 underline-offset-2 hover:text-emerald-700 hover:underline">
                          {r.nama}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-900">{r.nama}</span>
                      )}
                      {ownerName && canOpen(r) && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          Siswa saya
                        </span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-600 group-hover:bg-slate-50">{r.guru || "-"}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-600 group-hover:bg-slate-50">{r.asalSekolah || "-"}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center tabular-nums text-slate-600 group-hover:bg-slate-50">{r.gelombang}</td>
                    {SD_ASPEK.map((a) => {
                      const predikat = aspekPredikat(a, r.nilai)
                      return (
                        <Fragment key={a.id}>
                          {a.indikator.map((i, idx) => {
                            const n = r.nilai[i.kode]
                            return (
                              <td
                                key={i.kode}
                                title={n ? `${i.teks.id}: ${a.label[n].id}` : `${i.teks.id}: belum dinilai`}
                                className={cn(
                                  "w-12 min-w-12 border-b border-slate-100 text-center text-xs font-bold",
                                  idx === 0 && "border-l",
                                  n === "baik" && "bg-emerald-50 text-emerald-700",
                                  n === "perlu" && "bg-amber-100 text-amber-700",
                                  !n && "text-slate-300"
                                )}
                              >
                                {n === "baik" ? "✓" : n === "perlu" ? "!" : "–"}
                                <span className="sr-only">{n ? a.label[n].id : "belum dinilai"}</span>
                              </td>
                            )
                          })}
                          <td className="min-w-[96px] border-b border-slate-100 px-2 py-1 text-center group-hover:bg-slate-50">
                            {predikat ? (
                              <span
                                className={cn(
                                  "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ring-1 ring-inset",
                                  predikat === "baik" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"
                                )}
                              >
                                {a.label[predikat].id}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">–</span>
                            )}
                          </td>
                        </Fragment>
                      )
                    })}
                    <td className="border-b border-l border-slate-100 px-3 py-2 text-center tabular-nums group-hover:bg-slate-50">
                      <span
                        className={cn(
                          "font-semibold",
                          r.terisi === SD_JUMLAH_INDIKATOR ? "text-emerald-700" : r.terisi === 0 ? "text-slate-400" : "text-amber-700"
                        )}
                      >
                        {r.terisi}/{SD_JUMLAH_INDIKATOR}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center group-hover:bg-slate-50">
                      {r.keputusan ? (
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", KEPUTUSAN_TONE[r.keputusan] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>
                          {r.keputusan}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th
                    scope="row"
                    colSpan={fixedCols}
                    className="sticky bottom-0 left-0 z-20 border-t border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600"
                  >
                    % Berkembang per indikator
                  </th>
                  {SD_ASPEK.map((a) => (
                    <FooterAspek key={a.id} cells={a.indikator.map((i) => ({ kode: i.kode, teks: i.teks.id, data: persen(i.kode) }))} />
                  ))}
                  <td colSpan={2} className="sticky bottom-0 z-10 border-l border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
                    {visible.length} siswa
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function HeaderIndikator({ aspekId, items }: { aspekId: keyof typeof ASPEK_TONE; items: string[] }) {
  return (
    <>
      {items.map((teks, i) => (
        <th
          key={teks}
          scope="col"
          title={teks}
          className={cn("sticky top-10 z-20 h-52 w-12 min-w-12 border-b border-slate-200 bg-slate-50 px-0 align-bottom", i === 0 && "border-l")}
        >
          <div className="mx-auto max-h-48 overflow-hidden whitespace-normal break-words pb-2 text-left text-[11px] font-medium leading-tight text-slate-600 [writing-mode:vertical-rl] rotate-180">
            {i + 1}. {teks}
          </div>
        </th>
      ))}
      <th scope="col" className={cn("sticky top-10 z-20 h-52 min-w-[96px] border-b border-slate-200 px-2 align-bottom text-[11px] font-semibold", ASPEK_TONE[aspekId])}>
        <div className="pb-2">Predikat</div>
      </th>
    </>
  )
}

function FooterAspek({ cells }: { cells: { kode: string; teks: string; data: { pct: number; n: number } | null }[] }) {
  return (
    <>
      {cells.map((c, i) => (
        <td
          key={c.kode}
          title={c.data ? `${c.teks}: ${c.data.pct}% Berkembang (${c.data.n} siswa dinilai)` : `${c.teks}: belum ada penilaian`}
          className={cn(
            "sticky bottom-0 z-10 w-12 min-w-12 border-t border-slate-200 bg-slate-50 py-2 text-center text-[11px] font-semibold tabular-nums",
            i === 0 && "border-l",
            c.data ? (c.data.pct >= 80 ? "text-emerald-700" : c.data.pct >= 50 ? "text-amber-700" : "text-rose-700") : "text-slate-300"
          )}
        >
          {c.data ? `${c.data.pct}%` : "–"}
        </td>
      ))}
      <td className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50" />
    </>
  )
}
