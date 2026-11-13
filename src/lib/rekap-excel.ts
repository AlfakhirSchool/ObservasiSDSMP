/**
 * Ekspor tabel rekap ke Excel (.xlsx) yang rapi: header tebal berwarna, teks panjang dibungkus (wrap text),
 * lebar kolom menyesuaikan isi, tinggi baris menyesuaikan jumlah baris teks, dan header dibekukan.
 * Memakai xlsx-js-style (fork SheetJS yang mendukung style) dan dimuat dinamis hanya saat tombol diklik.
 */
import type { RekapFormData, RekapFormRow } from "@/lib/rekap-form"
import type { RekapSdRow } from "@/lib/rekap-sd"
import { SD_ASPEK, SD_JUMLAH_INDIKATOR, aspekPredikat } from "@/lib/raport-sd"

type Cell = string | number

const BORDER = {
  top: { style: "thin", color: { rgb: "CBD5E1" } },
  bottom: { style: "thin", color: { rgb: "CBD5E1" } },
  left: { style: "thin", color: { rgb: "CBD5E1" } },
  right: { style: "thin", color: { rgb: "CBD5E1" } },
}

const STYLE_HEADER = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { patternType: "solid", fgColor: { rgb: "0D5C63" } },
  alignment: { wrapText: true, vertical: "center", horizontal: "center" },
  border: BORDER,
}

const STYLE_BODY = {
  font: { sz: 10 },
  alignment: { wrapText: true, vertical: "top", horizontal: "left" },
  border: BORDER,
}

const STYLE_BODY_CENTER = {
  ...STYLE_BODY,
  alignment: { wrapText: true, vertical: "top", horizontal: "center" },
}

/** Lebar kolom minimum & maksimum (dalam karakter). Teks lebih panjang dari maksimum dibungkus. */
const MIN_W = 8
const MAX_W = 50
/** Tinggi satu baris teks (poin) untuk font 10–11. */
const LINE_PT = 14

/** Perkiraan jumlah baris saat teks dibungkus pada lebar kolom tertentu. */
function jumlahBaris(teks: string, lebar: number) {
  return teks.split(/\r?\n/).reduce((sum, bagian) => sum + Math.max(1, Math.ceil(bagian.length / Math.max(1, lebar - 1))), 0)
}

function namaFileAman(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_")
}

/**
 * Tulis satu lembar kerja dengan header + baris data, lalu unduh sebagai .xlsx.
 * `centerCols` = indeks kolom yang isinya rata tengah (angka, status, dsb).
 */
async function unduhXlsx(opts: {
  fileName: string
  sheetName: string
  header: string[]
  rows: Cell[][]
  centerCols?: number[]
  /** Lebar tetap per kolom (karakter); kolom lain dihitung otomatis dari isi. */
  fixedWidths?: Record<number, number>
  /** Jumlah kolom kiri yang dibekukan (mis. kolom Nama). */
  freezeCols?: number
}) {
  const mod = await import("xlsx-js-style")
  const XLSX = (mod as unknown as { default?: typeof mod }).default ?? mod
  const { header, rows, centerCols = [], fixedWidths = {}, freezeCols = 1 } = opts
  const center = new Set(centerCols)

  const aoa: Cell[][] = [header, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Lebar kolom menyesuaikan isi terpanjang (dibatasi MAX_W supaya teks panjang dibungkus, bukan melebar).
  const widths = header.map((h, c) => {
    if (fixedWidths[c]) return fixedWidths[c]
    let max = Math.min(String(h).length, 30)
    for (const r of rows) {
      const v = r[c]
      if (v === undefined || v === null) continue
      const terpanjang = String(v)
        .split(/\r?\n/)
        .reduce((m, s) => Math.max(m, s.length), 0)
      if (terpanjang > max) max = terpanjang
    }
    return Math.max(MIN_W, Math.min(MAX_W, max + 2))
  })
  ws["!cols"] = widths.map((wch) => ({ wch }))

  // Tinggi baris menyesuaikan jumlah baris teks terbanyak di baris itu.
  const tinggi = aoa.map((r, ri) => {
    let lines = 1
    r.forEach((v, c) => {
      if (v === undefined || v === null || v === "") return
      lines = Math.max(lines, jumlahBaris(String(v), widths[c]))
    })
    const pt = Math.min(409, lines * LINE_PT + 4)
    return { hpt: ri === 0 ? Math.max(30, pt) : pt }
  })
  ws["!rows"] = tinggi

  // Terapkan style ke setiap sel.
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[addr]) ws[addr] = { t: "s", v: "" }
      ws[addr].s = R === 0 ? STYLE_HEADER : center.has(C) ? STYLE_BODY_CENTER : STYLE_BODY
    }
  }

  // Bekukan baris header dan kolom Nama; aktifkan filter di header.
  ws["!freeze"] = { xSplit: freezeCols, ySplit: 1 }
  ws["!views"] = [{ state: "frozen", xSplit: freezeCols, ySplit: 1, topLeftCell: XLSX.utils.encode_cell({ r: 1, c: freezeCols }) }]
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName.slice(0, 31))
  const tanggal = new Date().toISOString().split("T")[0]
  XLSX.writeFile(wb, `${namaFileAman(opts.fileName)}_${tanggal}.xlsx`)
}

/** Ekspor rekap jawaban formulir (orang tua / siswa) sesuai baris yang sedang tampil (sudah difilter). */
export async function eksporRekapForm(data: RekapFormData, rows: RekapFormRow[], judul: string) {
  const header = ["No", "Nama", "Guru", "Gelombang", "Tahun Ajaran", "Terisi", ...data.questions.map((q, i) => `${i + 1}. ${q.text}`)]
  const body: Cell[][] = rows.map((r, idx) => [
    idx + 1,
    r.nama,
    r.guru || "-",
    r.gelombang,
    r.academicYear ?? "-",
    `${r.wajibTerjawab}/${data.wajibTotal}`,
    ...data.questions.map((q) => r.jawaban[q.id] ?? ""),
  ])
  await unduhXlsx({
    fileName: `Rekap_${judul}`,
    sheetName: judul,
    header,
    rows: body,
    centerCols: [0, 3, 4, 5],
    fixedWidths: { 0: 5 },
    freezeCols: 2,
  })
}

/** Ekspor rekap raport observasi SD sesuai baris yang sedang tampil. */
export async function eksporRekapSd(rows: RekapSdRow[]) {
  const header: string[] = ["No", "Nama", "Guru", "Asal Sekolah", "Gelombang"]
  const centerCols: number[] = [0, 4]
  for (const a of SD_ASPEK) {
    for (const i of a.indikator) {
      centerCols.push(header.length)
      header.push(`${a.judul.id} — ${i.teks.id}`)
    }
    centerCols.push(header.length)
    header.push(`Predikat ${a.judul.id}`)
  }
  centerCols.push(header.length, header.length + 1)
  header.push("Terisi", "Keputusan")

  const body: Cell[][] = rows.map((r, idx) => {
    const out: Cell[] = [idx + 1, r.nama, r.guru || "-", r.asalSekolah || "-", r.gelombang]
    for (const a of SD_ASPEK) {
      for (const i of a.indikator) {
        const n = r.nilai[i.kode]
        out.push(n ? a.label[n].id : "")
      }
      const p = aspekPredikat(a, r.nilai)
      out.push(p ? a.label[p].id : "")
    }
    out.push(`${r.terisi}/${SD_JUMLAH_INDIKATOR}`, r.keputusan ?? "")
    return out
  })

  // Kolom indikator dibuat sempit tetap (judul panjang dibungkus di header).
  const fixedWidths: Record<number, number> = { 0: 5 }
  header.forEach((_, c) => {
    if (c >= 5) fixedWidths[c] = 18
  })

  await unduhXlsx({
    fileName: "Rekap_Raport_Observasi_SD",
    sheetName: "Raport SD",
    header,
    rows: body,
    centerCols,
    fixedWidths,
    freezeCols: 2,
  })
}

/** Ekspor rekap observasi Al-Qur'an sesuai baris yang sedang tampil. */
export async function eksporRekapQuran(rows: { nama: string; level: string; gelombang: number; nilai: string | null; catatan: string; dinilaiOleh: string }[]) {
  const header = ["No", "Nama", "Jenjang", "Gelombang", "Nilai (A/B/C)", "Catatan", "Dinilai oleh"]
  const body: Cell[][] = rows.map((r, idx) => [idx + 1, r.nama, r.level, r.gelombang, r.nilai ?? "", r.catatan, r.dinilaiOleh])

  await unduhXlsx({
    fileName: "Rekap_Observasi_Al-Quran",
    sheetName: "Al-Quran",
    header,
    rows: body,
    centerCols: [0, 2, 3, 4],
    fixedWidths: { 0: 5, 5: 50 },
    freezeCols: 2,
  })
}
