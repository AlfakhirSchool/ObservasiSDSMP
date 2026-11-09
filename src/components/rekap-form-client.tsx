"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, CircleDashed, Clock, Table2, Users } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { RekapToolbar, cocokStatus, milikSayaDulu, type StatusFilter } from "@/components/rekap-toolbar"
import { StatCard } from "@/components/ui/stat-card"
import { filterByPeriod, listPeriods, periodeAwalBerisi, type PeriodFilterValue } from "@/lib/period"
import type { RekapFormData, RekapFormRow } from "@/lib/rekap-form"
import { cn } from "@/lib/utils"

/** Jawaban lebih panjang dari ini dipotong 3 baris dan dibuka penuh dengan klik. */
const PANJANG_POTONG = 90

interface Props {
  data: RekapFormData
  /** Nama pewawancara yang sedang login. Bila diisi, hanya siswa dengan guru ini yang bisa dibuka detailnya. */
  ownerName?: string
  /** Awal alamat halaman detail siswa, mis. "/admin/candidates". */
  detailBase: string
  /** Nama pengisi untuk teks bantu, mis. "orang tua" atau "siswa". */
  pengisi: string
  /** Untuk jenjang SD, semua observer boleh membuka detail siswa. */
  isSd?: boolean
}

export function RekapFormClient({ data, ownerName, detailBase, pengisi, isSd }: Props) {
  const { questions, rows } = data
  const [period, setPeriod] = useState<PeriodFilterValue>(() => periodeAwalBerisi(rows, (r) => r.terjawab > 0))
  const [guru, setGuru] = useState("")
  const [status, setStatus] = useState<StatusFilter>("semua")
  const [query, setQuery] = useState("")
  const [dibuka, setDibuka] = useState<ReadonlySet<string>>(new Set())

  const periods = useMemo(() => listPeriods(rows), [rows])
  const inPeriod = useMemo(() => filterByPeriod(rows, period, periods), [rows, period, periods])
  const gurus = useMemo(() => [...new Set(inPeriod.map((r) => r.guru).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [inPeriod])
  const scoped = useMemo(() => (guru ? inPeriod.filter((r) => r.guru === guru) : inPeriod), [inPeriod, guru])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cocok = scoped.filter(
      (r) =>
        (!q || r.nama.toLowerCase().includes(q) || Object.values(r.jawaban).some((v) => v.toLowerCase().includes(q))) &&
        cocokStatus(r.wajibTerjawab, data.wajibTotal, status)
    )
    return isSd ? cocok : milikSayaDulu(cocok, ownerName)
  }, [scoped, query, status, data.wajibTotal, ownerName, isSd])

  const lengkap = scoped.filter((r) => r.wajibTerjawab === data.wajibTotal).length
  const belum = scoped.filter((r) => r.wajibTerjawab === 0).length
  const sebagian = scoped.length - lengkap - belum

  const toggle = (key: string) =>
    setDibuka((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  /** Pewawancara hanya boleh membuka detail siswanya sendiri; admin dan seluruh observer SD boleh membuka semua. */
  const canOpen = (r: RekapFormRow) => !ownerName || isSd || r.guru === ownerName

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Siswa" value={scoped.length} icon={Users} tone="blue" />
        <StatCard label="Lengkap" value={lengkap} icon={CheckCircle2} tone="emerald" hint={`${data.wajibTotal} pertanyaan wajib terjawab`} />
        <StatCard label="Sebagian" value={sebagian} icon={Clock} tone="amber" hint="Belum semua dijawab" />
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
          searchLabel="Cari nama atau isi jawaban"
        />

        {questions.length === 0 ? (
          <EmptyState icon={Table2} title="Belum ada pertanyaan" description={`Pertanyaan untuk ${pengisi} belum dibuat di menu Observasi.`} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Table2}
            title={rows.length === 0 ? "Belum ada siswa" : "Tidak ada siswa yang cocok"}
            description={rows.length === 0 ? "Siswa akan muncul di sini setelah ditambahkan." : "Coba ubah kata kunci atau filter."}
          />
        ) : (
          <div className="relative max-h-[68vh] overflow-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 top-0 z-30 min-w-[160px] border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:min-w-[220px]">
                    Nama
                  </th>
                  <th scope="col" className="sticky top-0 z-20 min-w-[150px] border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Guru
                  </th>
                  <th scope="col" className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gel.
                  </th>
                  <th scope="col" className="sticky top-0 z-20 min-w-[84px] border-b border-l border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Terisi
                  </th>
                  {questions.map((q, i) => (
                    <th
                      key={q.id}
                      scope="col"
                      title={q.text}
                      className="sticky top-0 z-20 min-w-[220px] max-w-[260px] border-b border-l border-slate-200 bg-slate-50 px-3 py-3 text-left align-bottom text-xs font-semibold leading-snug text-slate-600"
                    >
                      <span className="line-clamp-4">
                        {i + 1}. {q.text}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="group">
                    <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-2 align-top group-hover:bg-slate-50">
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
                    <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-600 group-hover:bg-slate-50">{r.guru || "-"}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center align-top tabular-nums text-slate-600 group-hover:bg-slate-50">{r.gelombang}</td>
                    <td className="border-b border-l border-slate-100 px-3 py-2 text-center align-top tabular-nums group-hover:bg-slate-50">
                      <span
                        className={cn(
                          "font-semibold",
                          r.wajibTerjawab === data.wajibTotal ? "text-emerald-700" : r.wajibTerjawab === 0 ? "text-slate-400" : "text-amber-700"
                        )}
                      >
                        {r.wajibTerjawab}/{data.wajibTotal}
                      </span>
                    </td>
                    {questions.map((q) => {
                      const v = r.jawaban[q.id]
                      const key = `${r.id}:${q.id}`
                      const terbuka = dibuka.has(key)
                      return (
                        <td key={q.id} className="min-w-[220px] max-w-[260px] border-b border-l border-slate-100 px-3 py-2 align-top text-xs leading-snug text-slate-700 group-hover:bg-slate-50">
                          {!v ? (
                            <span className="text-slate-300">–</span>
                          ) : v.length > PANJANG_POTONG ? (
                            <button
                              type="button"
                              aria-expanded={terbuka}
                              title={terbuka ? "Klik untuk menutup" : "Klik untuk membuka penuh"}
                              onClick={() => toggle(key)}
                              className={cn("w-full whitespace-pre-wrap break-words text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40", !terbuka && "line-clamp-3")}
                            >
                              {v}
                            </button>
                          ) : (
                            <span className="whitespace-pre-wrap break-words">{v}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th
                    scope="row"
                    colSpan={4}
                    className="sticky bottom-0 left-0 z-20 border-t border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600"
                  >
                    Terjawab ({visible.length} siswa)
                  </th>
                  {questions.map((q) => (
                    <td key={q.id} className="sticky bottom-0 z-10 border-l border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tabular-nums text-slate-500">
                      {visible.filter((r) => r.jawaban[q.id] !== undefined).length}/{visible.length}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
