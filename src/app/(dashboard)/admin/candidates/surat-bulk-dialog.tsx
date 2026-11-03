"use client"

import { useMemo, useState } from "react"
import toast from "react-hot-toast"
import JSZip from "jszip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_KEPALA_SEKOLAH,
  SURAT_UNIT,
  SURAT_UNIT_AKTIF,
  isSuratUnit,
  suratDariSiswa,
  type SuratBuildResult,
  type SuratCandidateInput,
  type SuratData,
} from "@/lib/surat"
import { PERIOD_ALL, PERIOD_LATEST, filterByPeriod, listPeriods, periodKey, type PeriodFilterValue } from "@/lib/period"
import { buildSuratPdf, loadSuratAssets, suratFileName } from "@/lib/surat-pdf"
import { updateCandidate } from "@/lib/actions"
import { logRaportBulkDownload } from "@/lib/raport-actions"
import { cn } from "@/lib/utils"

export type SuratBulkCandidate = SuratCandidateInput & { id: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Semua siswa (dipilih periodenya di dalam dialog). */
  candidates: SuratBulkCandidate[]
}

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
const BADGE = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
const displayName = (c: SuratCandidateInput) => c.correctedName || c.name

interface Row {
  c: SuratBulkCandidate
  nim: string
  result: SuratBuildResult
  /** Nama sama dengan siswa lain di periode ini dan bukan data terbaru. */
  dupOlder: boolean
  dupName: boolean
  dupNim: boolean
}

export function SuratBulkDialog({ open, onOpenChange, candidates }: Props) {
  const [period, setPeriod] = useState<PeriodFilterValue>(PERIOD_LATEST)
  const [pattern, setPattern] = useState("{no}/B-{unit}/AL-FAKHIR/II/2026")
  const [start, setStart] = useState(1)
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10))
  const [kepalaSekolah, setKepalaSekolah] = useState(DEFAULT_KEPALA_SEKOLAH.SMP)
  const [busy, setBusy] = useState(false)
  /** NIM yang baru disimpan dari dialog ini (data induk baru ikut ter-update lewat polling). */
  const [nimSaved, setNimSaved] = useState<Record<string, string>>({})
  const [nimDraft, setNimDraft] = useState<Record<string, string>>({})
  const [savingNim, setSavingNim] = useState<string | null>(null)
  /** Pilihan manual admin; belum diatur = ikut aturan bawaan (siap & bukan data kembar lama). */
  const [picked, setPicked] = useState<Record<string, boolean>>({})

  const eligible = useMemo(() => candidates.filter((c) => isSuratUnit(c.level)), [candidates])
  const periods = useMemo(() => listPeriods(eligible), [eligible])
  const scoped = useMemo(() => filterByPeriod(eligible, period, periods), [eligible, period, periods])

  const rows: Row[] = useMemo(() => {
    const base = scoped.map((c) => {
      const nim = (nimSaved[c.id] ?? c.nim ?? "").trim()
      return { c, nim, result: suratDariSiswa({ ...c, nim }, { nomor: "", tanggal, kepalaSekolah }) }
    })

    const byName = new Map<string, typeof base>()
    const byNim = new Map<string, typeof base>()
    for (const r of base) {
      const nameKey = `${r.c.level}|${norm(displayName(r.c))}`
      byName.set(nameKey, [...(byName.get(nameKey) ?? []), r])
      if (r.nim) byNim.set(r.nim.toLowerCase(), [...(byNim.get(r.nim.toLowerCase()) ?? []), r])
    }
    const time = (c: SuratBulkCandidate) => new Date(c.createdAt).getTime()

    return base
      .map((r) => {
        const sameName = byName.get(`${r.c.level}|${norm(displayName(r.c))}`) ?? []
        const newest = sameName.reduce((a, b) => (time(b.c) > time(a.c) ? b : a), sameName[0])
        return {
          ...r,
          dupName: sameName.length > 1,
          dupOlder: sameName.length > 1 && newest.c.id !== r.c.id,
          dupNim: r.nim ? (byNim.get(r.nim.toLowerCase())?.length ?? 0) > 1 : false,
        }
      })
      .sort((a, b) => new Date(a.c.createdAt).getTime() - new Date(b.c.createdAt).getTime())
  }, [scoped, nimSaved, tanggal, kepalaSekolah])

  const isChecked = (r: Row) => r.result.ok && (picked[r.c.id] ?? !r.dupOlder)
  const selected = rows.filter(isChecked)

  const missingNim = rows.filter((r) => !r.nim).length
  const missingTes = rows.filter((r) => !r.result.ok && r.result.reason === "tes").length
  const missingKeputusan = rows.filter((r) => !r.result.ok && r.result.reason === "keputusan").length
  const dupNames = new Set(rows.filter((r) => r.dupName).map((r) => norm(displayName(r.c)))).size
  const dupNims = new Set(rows.filter((r) => r.dupNim).map((r) => r.nim.toLowerCase())).size

  const nomorUntuk = (i: number, unit: string) => pattern.replaceAll("{no}", String(start + i)).replaceAll("{unit}", unit)
  const patternValid = pattern.includes("{no}")
  const canRun = selected.length > 0 && patternValid && Number.isInteger(start) && start >= 0 && kepalaSekolah.trim() !== "" && !busy

  const saveNim = async (r: Row) => {
    const value = (nimDraft[r.c.id] ?? "").trim()
    if (!value) return
    setSavingNim(r.c.id)
    const res = await updateCandidate(r.c.id, { nim: value })
    setSavingNim(null)
    if (res.success) {
      setNimSaved((prev) => ({ ...prev, [r.c.id]: value }))
      toast.success(`NIM ${displayName(r.c)} disimpan`)
    } else {
      toast.error("Gagal menyimpan NIM")
    }
  }

  const run = async () => {
    setBusy(true)
    const toastId = toast.loading("Menyiapkan raport...")
    try {
      const zip = new JSZip()
      const usedNames = new Set<string>()
      for (let i = 0; i < selected.length; i++) {
        const r = selected[i]
        if (!r.result.ok) continue
        const data: SuratData = { ...r.result.data, nomor: nomorUntuk(i, r.result.data.unit), kepalaSekolah }
        toast.loading(`Membuat PDF ${i + 1}/${selected.length}: ${data.nama}...`, { id: toastId })
        const doc = await buildSuratPdf(data, await loadSuratAssets(data.unit))
        let name = suratFileName(data.nama)
        // Nama kembar yang sama-sama dipilih: tambahkan nomor urut supaya tidak saling menimpa di dalam zip.
        if (usedNames.has(name)) name = name.replace(/\.pdf$/, `_${start + i}.pdf`)
        usedNames.add(name)
        zip.file(name, doc.output("arraybuffer"))
      }
      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Raport_${tanggal}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      const periodLabel =
        period === PERIOD_ALL ? "Semua gelombang" : (periods.find((p) => p.key === (period === PERIOD_LATEST ? periods[0]?.key : period))?.label ?? "-")
      void logRaportBulkDownload(selected.length, periodLabel).catch(() => {})
      toast.success(`${selected.length} raport diunduh`, { id: toastId })
      onOpenChange(false)
    } catch {
      toast.error("Gagal membuat raport", { id: toastId })
    } finally {
      setBusy(false)
    }
  }

  const periodValue = period === PERIOD_LATEST ? (periods[0]?.key ?? PERIOD_ALL) : period

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)} className="max-w-3xl">
      <DialogHeader className="border-b border-slate-100 px-6 py-4">
        <DialogTitle>Unduh Raport</DialogTitle>
      </DialogHeader>
      <DialogDescription className="px-6 pt-4">
        Pilih gelombang, periksa NIM dan data kembar, lalu unduh semua raport {SURAT_UNIT_AKTIF.join(" & ")} sekaligus dalam satu zip. Tiap PDF
        dikunci dengan NIM siswanya.
      </DialogDescription>
      <DialogContent className="space-y-4 pt-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bulk-period" className="text-sm font-medium text-slate-700">
              Gelombang
            </label>
            <select
              id="bulk-period"
              value={periodValue}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            >
              {periods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.count} siswa)
                </option>
              ))}
              <option value={PERIOD_ALL}>Semua gelombang ({eligible.length} siswa)</option>
            </select>
          </div>
          <Input id="bulk-kepsek" label="Kepala sekolah" value={kepalaSekolah} onChange={(e) => setKepalaSekolah(e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Input
              id="bulk-pattern"
              label="Format nomor surat"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              error={patternValid ? undefined : "Harus memuat {no}"}
            />
          </div>
          <Input
            id="bulk-start"
            label="Nomor awal"
            type="number"
            min={0}
            value={start}
            onChange={(e) => setStart(Math.trunc(Number(e.target.value)))}
          />
          <Input id="bulk-tanggal" label="Tanggal surat" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          <span className="font-mono">{"{no}"}</span> = nomor urut (menurut urutan pendaftaran), <span className="font-mono">{"{unit}"}</span> = SD/SMP.
        </p>

        {(missingNim > 0 || missingTes > 0 || missingKeputusan > 0 || dupNames > 0 || dupNims > 0) && (
          <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
            {missingNim > 0 && <li>{missingNim} siswa belum punya NIM. Isi NIM di daftar di bawah agar raportnya bisa dibuat.</li>}
            {missingTes > 0 && <li>{missingTes} siswa SMP belum mengerjakan tes akademik.</li>}
            {missingKeputusan > 0 && <li>{missingKeputusan} siswa belum punya keputusan dari pewawancara.</li>}
            {dupNames > 0 && (
              <li>
                {dupNames} nama muncul lebih dari sekali. Hanya data terbaru yang dicentang; centang sendiri jika memang siswa berbeda.
              </li>
            )}
            {dupNims > 0 && <li>{dupNims} NIM dipakai lebih dari satu siswa. Periksa dan perbaiki sebelum mengunduh.</li>}
          </ul>
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-700">
            <span className="font-semibold tabular-nums">{selected.length}</span> dari{" "}
            <span className="tabular-nums">{rows.length}</span> siswa akan diunduh
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="font-semibold text-emerald-700 underline underline-offset-2"
              onClick={() => setPicked(Object.fromEntries(rows.map((r) => [r.c.id, r.result.ok])))}
            >
              Pilih semua yang siap
            </button>
            <button
              type="button"
              className="font-semibold text-slate-600 underline underline-offset-2"
              onClick={() => setPicked(Object.fromEntries(rows.map((r) => [r.c.id, false])))}
            >
              Kosongkan
            </button>
          </div>
        </div>

        <div className="max-h-[34vh] overflow-auto rounded-xl border border-slate-200">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Belum ada siswa SMP pada pilihan ini.</p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-3 py-2" aria-label="Pilih" />
                  <th className="px-3 py-2 font-semibold">Nama</th>
                  <th className="px-3 py-2 font-semibold">NIM</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.c.id} className={cn(!isChecked(r) && "bg-slate-50/60")}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${displayName(r.c)}`}
                        checked={isChecked(r)}
                        disabled={!r.result.ok}
                        onChange={(e) => setPicked((prev) => ({ ...prev, [r.c.id]: e.target.checked }))}
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{displayName(r.c)}</p>
                      <p className="text-xs text-slate-500">
                        {SURAT_UNIT[r.c.level === "SD" ? "SD" : "SMP"].nama} · {periodKey(r.c).replace("|", " · gel. ")}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {r.nim ? (
                        <span className="font-mono text-slate-700">{r.nim}</span>
                      ) : (
                        <input
                          aria-label={`NIM ${displayName(r.c)}`}
                          placeholder="Isi NIM"
                          inputMode="numeric"
                          autoComplete="off"
                          value={nimDraft[r.c.id] ?? ""}
                          disabled={savingNim === r.c.id}
                          onChange={(e) => setNimDraft((prev) => ({ ...prev, [r.c.id]: e.target.value }))}
                          onBlur={() => saveNim(r)}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          className="h-8 w-32 rounded-lg border border-amber-300 bg-white px-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.result.ok ? (
                          <span className={cn(BADGE, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>Siap</span>
                        ) : r.result.reason === "nim" ? (
                          <span className={cn(BADGE, "bg-amber-50 text-amber-700 ring-amber-200")}>Belum ada NIM</span>
                        ) : r.result.reason === "tes" ? (
                          <span className={cn(BADGE, "bg-amber-50 text-amber-700 ring-amber-200")}>Belum tes</span>
                        ) : (
                          <span className={cn(BADGE, "bg-amber-50 text-amber-700 ring-amber-200")}>Belum ada keputusan</span>
                        )}
                        {r.dupName && (
                          <span className={cn(BADGE, "bg-rose-50 text-rose-700 ring-rose-200")}>
                            {r.dupOlder ? "Nama kembar (lama)" : "Nama kembar (terbaru)"}
                          </span>
                        )}
                        {r.dupNim && <span className={cn(BADGE, "bg-rose-50 text-rose-700 ring-rose-200")}>NIM sama</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
      <DialogFooter className="border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={busy}
          className={`${BTN} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
        >
          Batal
        </button>
        <button type="button" onClick={run} disabled={!canRun} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}>
          {busy ? "Membuat..." : `Unduh ${selected.length} raport (.zip)`}
        </button>
      </DialogFooter>
    </Dialog>
  )
}
