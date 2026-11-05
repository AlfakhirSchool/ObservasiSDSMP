"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { SURAT_STATUS_OPTIONS, type SuratStatus } from "@/lib/surat"
import {
  SD_ASPEK,
  SD_JUMLAH_INDIKATOR,
  aspekPredikat,
  bangunAspekHasil,
  catatanBawaan,
  parseSdRaport,
  type RaportSdData,
  type SdAspekId,
  type SdNilai,
  type SdNilaiMap,
} from "@/lib/raport-sd"
import { buildRaportSdPdf, loadRaportSdAssets, raportSdFileName } from "@/lib/raport-sd-pdf"
import { logRaportDownload } from "@/lib/raport-actions"
import { cn } from "@/lib/utils"

export interface RaportSdInitial {
  nama: string
  asalSekolah: string
  nim: string
  gelombang: number
  jumlahSiswa: number
  /** yyyy-mm-dd */
  tanggal: string
  kepalaSekolah: string
  ketuaPelaksana: string
  status: SuratStatus | ""
  /** Candidate.sdRaport (JSON) isian guru. */
  sdRaport: string | null
}

const FIELD = "flex flex-col gap-1.5"
const LABEL = "text-sm font-medium text-slate-700"
const AREA =
  "min-h-[76px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"

export default function RaportSdClient({ initial }: { initial: RaportSdInitial }) {
  const { id } = useParams<{ id: string }>()
  const guru = useMemo(() => parseSdRaport(initial.sdRaport), [initial.sdRaport])

  const [nama, setNama] = useState(initial.nama)
  const [asalSekolah, setAsalSekolah] = useState(initial.asalSekolah)
  const [nim, setNim] = useState(initial.nim)
  const [gelombang, setGelombang] = useState(initial.gelombang)
  const [jumlahSiswa, setJumlahSiswa] = useState(initial.jumlahSiswa)
  const [tanggal, setTanggal] = useState(initial.tanggal)
  const [kepalaSekolah, setKepalaSekolah] = useState(initial.kepalaSekolah)
  const [ketuaPelaksana, setKetuaPelaksana] = useState(initial.ketuaPelaksana)
  const [status, setStatus] = useState<SuratStatus | "">(initial.status)
  const [nilai, setNilai] = useState<SdNilaiMap>(guru.nilai)
  const [catatanId, setCatatanId] = useState<Partial<Record<SdAspekId, string>>>(guru.catatan)
  const [catatanEn, setCatatanEn] = useState<Partial<Record<SdAspekId, string>>>({})

  const [busy, setBusy] = useState<"preview" | "download" | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    []
  )

  const terisi = SD_ASPEK.reduce((sum, a) => sum + a.indikator.filter((i) => nilai[i.kode] !== undefined).length, 0)

  const aspek = useMemo(() => {
    const base = bangunAspekHasil(nama, { nilai, catatan: catatanId })
    return base?.map((a) => ({ ...a, catatan: { ...a.catatan, en: catatanEn[a.id]?.trim() || a.catatan.en } })) ?? null
  }, [nama, nilai, catatanId, catatanEn])

  const masalah = [
    !status && "keputusan belum dipilih",
    !aspek && `indikator belum lengkap (${terisi}/${SD_JUMLAH_INDIKATOR})`,
    !kepalaSekolah.trim() && "nama kepala sekolah kosong",
    !ketuaPelaksana.trim() && "nama ketua pelaksana kosong",
    !nama.trim() && "nama siswa kosong",
  ].filter((v): v is string => Boolean(v))

  const buatData = (): RaportSdData | null => {
    if (!status || !aspek) return null
    return {
      nomor: "",
      tanggal,
      nama: nama.trim(),
      asalSekolah: asalSekolah.trim(),
      nim: nim.trim(),
      gelombang,
      jumlahSiswa,
      status,
      kepalaSekolah: kepalaSekolah.trim(),
      ketuaPelaksana: ketuaPelaksana.trim(),
      aspek,
    }
  }

  const pratinjau = async () => {
    const data = buatData()
    if (!data || masalah.length > 0) return
    setBusy("preview")
    try {
      // Tanpa kunci: hanya untuk dilihat di halaman ini, tidak diunduh.
      const doc = await buildRaportSdPdf(data, await loadRaportSdAssets(), { encrypt: false })
      const url = URL.createObjectURL(doc.output("blob"))
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      previewRef.current = url
      setPreviewUrl(url)
    } catch {
      toast.error("Gagal membuat pratinjau")
    } finally {
      setBusy(null)
    }
  }

  const unduh = async () => {
    const data = buatData()
    if (!data || masalah.length > 0) return
    if (!data.nim) {
      toast.error("NIM wajib diisi karena dipakai sebagai kata sandi PDF")
      return
    }
    setBusy("download")
    try {
      const doc = await buildRaportSdPdf(data, await loadRaportSdAssets())
      doc.save(raportSdFileName(data.nama))
      void logRaportDownload(id).catch(() => {})
      toast.success("PDF berhasil diunduh (kata sandi = NIM)")
    } catch {
      toast.error("Gagal membuat PDF")
    } finally {
      setBusy(null)
    }
  }

  const setNilaiIndikator = (kode: string, value: SdNilai) =>
    setNilai((prev) => {
      const next = { ...prev }
      if (next[kode] === value) delete next[kode]
      else next[kode] = value
      return next
    })

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <header>
            <h1 className="text-xl font-bold text-slate-900">Raport Observasi SD</h1>
            <p className="mt-1 text-sm text-slate-500">
              Isi awal berasal dari penilaian guru. Ubah bila perlu lalu klik Pratinjau; perubahan di sini hanya untuk PDF ini dan tidak mengubah data
              guru.
            </p>
          </header>

          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2" aria-label="Data siswa">
            <Input id="sd-nama" label="Nama siswa" value={nama} onChange={(e) => setNama(e.target.value)} />
            <Input id="sd-asal" label="Asal sekolah" value={asalSekolah} onChange={(e) => setAsalSekolah(e.target.value)} />
            <Input
              id="sd-nim"
              label="NIM (kata sandi PDF)"
              value={nim}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => setNim(e.target.value)}
            />
            <div className={FIELD}>
              <label htmlFor="sd-status" className={LABEL}>
                Keputusan
              </label>
              <select
                id="sd-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as SuratStatus | "")}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">Pilih keputusan</option>
                {SURAT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="sd-gelombang"
              label="Gelombang"
              type="number"
              min={1}
              value={gelombang}
              onChange={(e) => setGelombang(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
            />
            <Input
              id="sd-jumlah"
              label="Jumlah calon siswa diobservasi"
              type="number"
              min={1}
              value={jumlahSiswa}
              onChange={(e) => setJumlahSiswa(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
            />
            <Input id="sd-tanggal" label="Tanggal raport" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            <Input id="sd-kepsek" label="Kepala sekolah" value={kepalaSekolah} onChange={(e) => setKepalaSekolah(e.target.value)} />
            <Input id="sd-ketua" label="Ketua pelaksana" value={ketuaPelaksana} onChange={(e) => setKetuaPelaksana(e.target.value)} />
          </section>

          {SD_ASPEK.map((a) => {
            const predikat = aspekPredikat(a, nilai)
            return (
              <section key={a.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label={a.judul.id}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{a.judul.id}</h2>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                      predikat === "baik" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
                      predikat === "perlu" && "bg-amber-50 text-amber-700 ring-amber-200",
                      !predikat && "bg-slate-100 text-slate-500 ring-slate-200"
                    )}
                  >
                    {predikat ? a.label[predikat].id : "Belum lengkap"}
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {a.indikator.map((i) => (
                    <li key={i.kode} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-slate-800">{i.teks.id}</span>
                      <div role="group" aria-label={i.teks.id} className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5">
                        {(["baik", "perlu"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={nilai[i.kode] === v}
                            onClick={() => setNilaiIndikator(i.kode, v)}
                            className={cn(
                              "rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                              nilai[i.kode] === v
                                ? v === "baik"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-amber-500 text-white"
                                : "text-slate-600 hover:bg-white"
                            )}
                          >
                            {a.label[v].id}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={FIELD}>
                    <label htmlFor={`cid-${a.id}`} className={LABEL}>
                      Catatan (Indonesia)
                    </label>
                    <textarea
                      id={`cid-${a.id}`}
                      className={AREA}
                      maxLength={600}
                      value={catatanId[a.id] ?? ""}
                      placeholder={predikat ? catatanBawaan(a, predikat, nama, "id") : "Terisi otomatis setelah indikator dinilai"}
                      onChange={(e) => setCatatanId((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  </div>
                  <div className={FIELD}>
                    <label htmlFor={`cen-${a.id}`} className={LABEL}>
                      Note (English)
                    </label>
                    <textarea
                      id={`cen-${a.id}`}
                      className={AREA}
                      maxLength={600}
                      value={catatanEn[a.id] ?? ""}
                      placeholder={predikat ? catatanBawaan(a, predikat, nama, "en") : "Generated automatically once indicators are rated"}
                      onChange={(e) => setCatatanEn((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Kosongkan untuk memakai catatan otomatis sesuai predikat.</p>
              </section>
            )
          })}

          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <button
              type="button"
              onClick={pratinjau}
              disabled={masalah.length > 0 || busy !== null}
              className={`${BTN} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              {busy === "preview" ? "Membuat pratinjau..." : "Pratinjau PDF"}
            </button>
            <button
              type="button"
              onClick={unduh}
              disabled={masalah.length > 0 || busy !== null}
              className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              {busy === "download" ? "Membuat PDF..." : "Unduh PDF"}
            </button>
            {masalah.length > 0 && (
              <p role="status" className="text-sm text-amber-700">
                Belum bisa: {masalah.join(", ")}.
              </p>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]" aria-label="Pratinjau PDF">
          {previewUrl ? (
            <iframe title="Pratinjau raport SD" src={previewUrl} className="h-[80vh] w-full rounded-2xl border border-slate-200 bg-white lg:h-full" />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 lg:h-full">
              Klik &quot;Pratinjau PDF&quot; untuk melihat raport lengkap (8 halaman, dua bahasa) sebelum diunduh.
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
