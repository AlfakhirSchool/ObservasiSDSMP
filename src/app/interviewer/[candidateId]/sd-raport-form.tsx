"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { CheckCircle, ClipboardList, RefreshCw, Save, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  SD_ASPEK,
  SD_CATATAN_MAKS,
  SD_INDIKATOR_KODE,
  SD_JUMLAH_INDIKATOR,
  aspekPredikat,
  catatanBawaan,
  parseSdRaport,
  type SdAspekId,
  type SdNilai,
  type SdNilaiMap,
} from "@/lib/raport-sd"

const ACCENT = "#E67E22"
const ASAL_SEKOLAH_MAKS = 120

interface Props {
  candidateId: string
  candidateName: string
  initialAsalSekolah: string | null
  initialSdRaport: string | null
  canEdit: boolean
  onSaved?: (updated: { asalSekolah: string; sdRaportRaw: string; filledCount: number }) => void
}

type CatatanMap = Partial<Record<SdAspekId, string>>

const NILAI_STYLE: Record<SdNilai, { aktif: string; badge: string }> = {
  baik: {
    aktif: "border-emerald-500 bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  perlu: {
    aktif: "border-amber-500 bg-amber-50 text-amber-700",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
  },
}

const NILAI_URUT: SdNilai[] = ["baik", "perlu"]

/** Bentuk isian yang akan dikirim/disimpan; dipakai juga untuk mendeteksi perubahan. */
function bentukSimpan(asal: string, nilai: SdNilaiMap, catatan: CatatanMap) {
  const nilaiOut: Record<string, SdNilai> = {}
  for (const kode of SD_INDIKATOR_KODE) {
    const v = nilai[kode]
    if (v) nilaiOut[kode] = v
  }
  const catatanOut: CatatanMap = {}
  for (const aspek of SD_ASPEK) {
    const teks = catatan[aspek.id]?.trim()
    if (teks) catatanOut[aspek.id] = teks
  }
  return { asalSekolah: asal.trim(), nilai: nilaiOut, catatan: catatanOut }
}

export default function SdRaportForm({
  candidateId,
  candidateName,
  initialAsalSekolah,
  initialSdRaport,
  canEdit,
  onSaved,
}: Props) {
  const router = useRouter()
  const [awal] = useState(() => parseSdRaport(initialSdRaport))
  const [asal, setAsal] = useState(initialAsalSekolah ?? "")
  const [nilai, setNilai] = useState<SdNilaiMap>(awal.nilai)
  const [catatan, setCatatan] = useState<CatatanMap>(awal.catatan)
  const [tersimpan, setTersimpan] = useState(() =>
    JSON.stringify(bentukSimpan(initialAsalSekolah ?? "", awal.nilai, awal.catatan))
  )
  const [saving, setSaving] = useState(false)

  const sekarang = bentukSimpan(asal, nilai, catatan)
  const terisi = Object.keys(sekarang.nilai).length
  const dirty = JSON.stringify(sekarang) !== tersimpan
  const persen = Math.round((terisi / SD_JUMLAH_INDIKATOR) * 100)

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const pilihNilai = (kode: string, pilihan: SdNilai) => {
    if (!canEdit) return
    setNilai((prev) => {
      const next = { ...prev }
      if (next[kode] === pilihan) delete next[kode]
      else next[kode] = pilihan
      return next
    })
  }

  const ubahCatatan = (id: SdAspekId, teks: string, bawaan: string | null) => {
    setCatatan((prev) => {
      const next = { ...prev }
      // Teks yang sama dengan catatan otomatis bukan override.
      if (bawaan !== null && teks === bawaan) delete next[id]
      else next[id] = teks
      return next
    })
  }

  const pakaiOtomatis = (id: SdAspekId) =>
    setCatatan((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

  const handleSimpan = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/sd-raport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, ...sekarang }),
      })
      const data: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan raport")
      setTersimpan(JSON.stringify(sekarang))
      toast.success("Raport SD berhasil disimpan")
      onSaved?.({
        asalSekolah: sekarang.asalSekolah,
        sdRaportRaw: JSON.stringify({ nilai: sekarang.nilai, catatan: sekarang.catatan }),
        filledCount: Object.keys(sekarang.nilai).length,
      })
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: ACCENT }}
        >
          <ClipboardList size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Raport Observasi SD</h2>
          <p className="text-sm text-slate-500">
            {canEdit
              ? "Isi penilaian tiap indikator, lalu Simpan. Bisa diubah lagi kapan saja."
              : "Isian raport observasi (hanya baca)."}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <Input
          id="sd-asal-sekolah"
          label="Asal sekolah (TK/PAUD)"
          placeholder="Contoh: TK Al-Fakhir"
          maxLength={ASAL_SEKOLAH_MAKS}
          value={asal}
          onChange={(e) => setAsal(e.target.value)}
          readOnly={!canEdit}
        />

        <div className="space-y-1.5" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              {terisi} dari {SD_JUMLAH_INDIKATOR} indikator terisi
            </span>
            <span className="text-slate-500">{persen}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={SD_JUMLAH_INDIKATOR}
            aria-valuenow={terisi}
          >
            <div className="h-full rounded-full transition-all" style={{ width: `${persen}%`, backgroundColor: ACCENT }} />
          </div>
        </div>

        {SD_ASPEK.map((aspek, idx) => {
          const predikat = aspekPredikat(aspek, nilai)
          const bawaan = predikat ? catatanBawaan(aspek, predikat, candidateName, "id") : null
          const override = catatan[aspek.id]
          const nilaiTeks = override !== undefined ? override : (bawaan ?? "")
          const idCatatan = `sd-catatan-${aspek.id}`
          return (
            <fieldset key={aspek.id} className="min-w-0 space-y-4 border-t border-slate-100 pt-5">
              <legend className="sr-only">{aspek.judul.id}</legend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {idx + 1}. {aspek.judul.id}
                </h3>
                {predikat ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                      NILAI_STYLE[predikat].badge
                    )}
                  >
                    {aspek.label[predikat].id}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                    Belum lengkap
                  </span>
                )}
              </div>

              <ul className="space-y-3">
                {aspek.indikator.map((ind) => (
                  <li key={ind.kode} className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <p className="text-sm text-slate-800">{ind.teks.id}</p>
                    <div role="group" aria-label={ind.teks.id} className="grid grid-cols-2 gap-2">
                      {NILAI_URUT.map((pilihan) => {
                        const aktif = nilai[ind.kode] === pilihan
                        return (
                          <button
                            key={pilihan}
                            type="button"
                            aria-pressed={aktif}
                            disabled={!canEdit}
                            onClick={() => pilihNilai(ind.kode, pilihan)}
                            className={cn(
                              "min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-default",
                              aktif
                                ? NILAI_STYLE[pilihan].aktif
                                : "border-slate-200 bg-white text-slate-600 enabled:hover:bg-slate-50"
                            )}
                          >
                            {aspek.label[pilihan].id}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={idCatatan} className="text-sm font-medium text-slate-700">
                    Catatan
                  </label>
                  {canEdit && override !== undefined && bawaan !== null && (
                    <button
                      type="button"
                      onClick={() => pakaiOtomatis(aspek.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                    >
                      <Wand2 size={12} aria-hidden="true" />
                      Pakai catatan otomatis
                    </button>
                  )}
                </div>
                <textarea
                  id={idCatatan}
                  value={nilaiTeks}
                  maxLength={SD_CATATAN_MAKS}
                  readOnly={!canEdit}
                  placeholder={
                    bawaan ?? "Lengkapi semua indikator aspek ini untuk melihat catatan otomatis, atau tulis catatan sendiri."
                  }
                  onChange={(e) => ubahCatatan(aspek.id, e.target.value, bawaan)}
                  className="min-h-[110px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 read-only:bg-slate-50"
                />
                <p className="text-xs text-slate-500">
                  {override === undefined && bawaan !== null
                    ? "Catatan otomatis dari penilaian. Ketik untuk menggantinya. "
                    : ""}
                  Versi Inggris dibuat otomatis dari penilaian.
                </p>
              </div>
            </fieldset>
          )
        })}

        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-sm" aria-live="polite">
              {dirty ? (
                <span className="font-medium text-amber-600">Ada perubahan yang belum disimpan</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                  <CheckCircle size={14} aria-hidden="true" />
                  Tersimpan
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={handleSimpan}
              disabled={!dirty || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? (
                <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
