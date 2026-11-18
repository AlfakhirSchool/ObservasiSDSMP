/**
 * Ekspor tabel rekap ke Excel (.xlsx): banner judul, header berwarna (dengan baris kelompok bila ada),
 * baris belang-belang, sel status berwarna (hijau/kuning/merah), teks panjang dibungkus, lebar kolom dan
 * tinggi baris menyesuaikan isi, header + kolom nama dibekukan, filter, dan siap cetak A4 landscape.
 * Memakai exceljs; dimuat dinamis hanya saat tombol unduh diklik.
 */
import type { RekapFormData, RekapFormRow } from "@/lib/rekap-form"
import type { RekapSdRow } from "@/lib/rekap-sd"
import type { RekapAkademikSmpRow } from "@/lib/rekap-akademik"
import { SD_ASPEK, SD_JUMLAH_INDIKATOR, aspekPredikat } from "@/lib/raport-sd"

type Cell = string | number

interface Tone {
  bg: string
  fg: string
}

/** Kelompok kolom di atas header (mis. aspek penilaian). `from`/`to` = indeks kolom berbasis 0, inklusif. */
interface Group {
  label: string
  from: number
  to: number
  color: string
}

const GOOD: Tone = { bg: "D1FAE5", fg: "065F46" }
const WARN: Tone = { bg: "FEF3C7", fg: "92400E" }
const BAD: Tone = { bg: "FFE4E6", fg: "9F1239" }

const BRAND = "0D5C63"
const BRAND_DARK = "0A454A"
const INK = "0F172A"
const MUTED = "64748B"
const LINE = "CBD5E1"
const ZEBRA = "F1F5F9"
const FONT = "Calibri"

/** Lebar kolom minimum & maksimum (dalam karakter). Teks lebih panjang dari maksimum dibungkus. */
const MIN_W = 8
const MAX_W = 50
/** Tinggi satu baris teks (poin) untuk font 10–11. */
const LINE_PT = 14
const MAX_ROW_PT = 409

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** Perkiraan jumlah baris saat teks dibungkus pada lebar kolom tertentu. */
function jumlahBaris(teks: string, lebar: number) {
  return teks.split(/\r?\n/).reduce((sum, bagian) => sum + Math.max(1, Math.ceil(bagian.length / Math.max(1, lebar - 1))), 0)
}

function namaFileAman(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_")
}

function solid(rgb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: `FF${rgb}` } }
}

function border(rgb: string) {
  const side = { style: "thin" as const, color: { argb: `FF${rgb}` } }
  return { top: side, bottom: side, left: side, right: side }
}

function unduhBlob(blob: Blob, nama: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Tulis satu lembar kerja (judul + header + data), lalu unduh sebagai .xlsx.
 * `centerCols` = indeks kolom yang isinya rata tengah (angka, status, dsb).
 * `tone` = pewarnaan sel status berdasarkan kolom dan isinya.
 */
async function unduhXlsx(opts: {
  fileName: string
  sheetName: string
  title: string
  header: string[]
  rows: Cell[][]
  centerCols?: number[]
  /** Lebar tetap per kolom (karakter); kolom lain dihitung otomatis dari isi. */
  fixedWidths?: Record<number, number>
  /** Jumlah kolom kiri yang dibekukan (mis. kolom Nama). */
  freezeCols?: number
  groups?: Group[]
  tone?: (col: number, value: Cell) => Tone | undefined
}) {
  // Dinamis: exceljs besar (~1 MB min) dan hanya dibutuhkan saat tombol unduh diklik, jangan masuk bundle awal halaman.
  const mod = await import("exceljs")
  const ExcelJS = mod.default ?? mod
  const { header, rows, centerCols = [], fixedWidths = {}, freezeCols = 1, groups, tone } = opts
  const center = new Set(centerCols)
  const colCount = header.length

  const wb = new ExcelJS.Workbook()
  wb.creator = "Al Fakhir Observation Dashboard"
  wb.created = new Date()

  // Excel menolak nama lembar berisi \ / ? * [ ] : dan lebih dari 31 karakter.
  const ws = wb.addWorksheet(opts.sheetName.replace(/[\\/?*[\]:]+/g, "-").slice(0, 31), {
    properties: { tabColor: { argb: `FF${BRAND}` } },
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: { oddFooter: "&L&8Al Fakhir Observation Dashboard&R&8Halaman &P dari &N" },
    views: [{ showGridLines: false }],
  })

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
  widths.forEach((w, c) => {
    ws.getColumn(c + 1).width = w
  })

  // Banner judul + subjudul.
  const lastCol = Math.max(colCount, 2)
  ws.mergeCells(1, 1, 1, lastCol)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = opts.title
  titleCell.font = { name: FONT, size: 16, bold: true, color: { argb: "FFFFFFFF" } }
  titleCell.fill = solid(BRAND)
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  ws.getRow(1).height = 32

  ws.mergeCells(2, 1, 2, lastCol)
  const subCell = ws.getCell(2, 1)
  const diekspor = new Date().toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
  subCell.value = `Al Fakhir · Diekspor ${diekspor} · ${rows.length} data`
  subCell.font = { name: FONT, size: 10, italic: true, color: { argb: `FF${MUTED}` } }
  subCell.fill = solid("F8FAFC")
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  ws.getRow(2).height = 20

  ws.getRow(3).height = 6

  // Baris kelompok (opsional), lalu header.
  let headerRow = 4
  if (groups?.length) {
    for (const g of groups) {
      if (g.to > g.from) ws.mergeCells(4, g.from + 1, 4, g.to + 1)
      const cell = ws.getCell(4, g.from + 1)
      cell.value = g.label
      cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } }
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      for (let c = g.from; c <= g.to; c++) {
        const gc = ws.getCell(4, c + 1)
        gc.fill = solid(g.color)
        gc.border = border("FFFFFF")
      }
    }
    ws.getRow(4).height = 22
    headerRow = 5
  }

  const head = ws.getRow(headerRow)
  header.forEach((h, c) => {
    const cell = head.getCell(c + 1)
    cell.value = h
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = solid(BRAND_DARK)
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = border("FFFFFF")
  })
  const headLines = header.reduce((m, h, c) => Math.max(m, jumlahBaris(String(h), widths[c])), 1)
  head.height = Math.min(110, Math.max(32, headLines * LINE_PT + 8))

  // Data: baris belang, status berwarna, tinggi baris mengikuti teks terpanjang.
  rows.forEach((r, ri) => {
    const row = ws.getRow(headerRow + 1 + ri)
    let lines = 1
    for (let c = 0; c < colCount; c++) {
      const v = r[c] ?? ""
      const cell = row.getCell(c + 1)
      cell.value = v
      cell.border = border(LINE)
      cell.alignment = { vertical: "top", horizontal: center.has(c) ? "center" : "left", wrapText: true }

      const t = v === "" ? undefined : tone?.(c, v)
      if (t) {
        cell.fill = solid(t.bg)
        cell.font = { name: FONT, size: 10, bold: true, color: { argb: `FF${t.fg}` } }
      } else {
        if (ri % 2 === 1) cell.fill = solid(ZEBRA)
        cell.font = { name: FONT, size: 10, color: { argb: `FF${INK}` } }
      }

      if (v !== "") lines = Math.max(lines, jumlahBaris(String(v), widths[c]))
    }
    row.height = Math.min(MAX_ROW_PT, lines * LINE_PT + 4)
  })

  // Bekukan judul + header dan kolom Nama; filter di baris header.
  ws.views = [{ state: "frozen", xSplit: freezeCols, ySplit: headerRow, showGridLines: false }]
  const lastRow = headerRow + Math.max(rows.length, 1)
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastRow, column: colCount } }
  ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`

  const buffer = await wb.xlsx.writeBuffer()
  const tanggal = new Date().toISOString().split("T")[0]
  unduhBlob(new Blob([buffer], { type: XLSX_MIME }), `${namaFileAman(opts.fileName)}_${tanggal}.xlsx`)
}

/** "Terisi" a/b: lengkap hijau, sebagian kuning, kosong merah. */
function toneTerisi(v: Cell): Tone | undefined {
  const m = /^(\d+)\/(\d+)$/.exec(String(v))
  if (!m) return undefined
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (b === 0) return undefined
  return a >= b ? GOOD : a === 0 ? BAD : WARN
}

const TONE_KEPUTUSAN: Record<string, Tone> = { Terima: GOOD, Pertimbangkan: WARN, Tolak: BAD }

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
    title: `Rekap ${judul.replace(/_/g, " ")}`,
    header,
    rows: body,
    centerCols: [0, 3, 4, 5],
    fixedWidths: { 0: 5 },
    freezeCols: 2,
    groups: [
      { label: "Data Siswa", from: 0, to: 5, color: BRAND },
      ...(header.length > 6 ? [{ label: "Jawaban Formulir", from: 6, to: header.length - 1, color: "334155" }] : []),
    ],
    tone: (c, v) => (c === 5 ? toneTerisi(v) : undefined),
  })
}

/** Ekspor rekap raport observasi SD sesuai baris yang sedang tampil. */
export async function eksporRekapSd(rows: RekapSdRow[]) {
  const header: string[] = ["No", "Nama", "Guru", "Asal Sekolah", "Gelombang"]
  const centerCols: number[] = [0, 4]
  const groups: Group[] = [{ label: "Data Siswa", from: 0, to: 4, color: BRAND }]
  const aspekColor: Record<string, string> = { kognitif: "2563EB", motorikHalus: "7C3AED", motorikKasar: "B45309", quran: "047857" }
  /** Kolom penilaian -> peta teks ke warna (Al-Qur'an memakai label berbeda untuk "perlu"). */
  const penilaian = new Map<number, Record<string, Tone>>()

  for (const a of SD_ASPEK) {
    const from = header.length
    const peta: Record<string, Tone> = { [a.label.baik.id]: GOOD, [a.label.perlu.id]: a.id === "quran" ? WARN : BAD }
    for (const i of a.indikator) {
      centerCols.push(header.length)
      penilaian.set(header.length, peta)
      header.push(`${a.judul.id} — ${i.teks.id}`)
    }
    centerCols.push(header.length)
    penilaian.set(header.length, peta)
    header.push(`Predikat ${a.judul.id}`)
    groups.push({ label: a.judul.id, from, to: header.length - 1, color: aspekColor[a.id] ?? "334155" })
  }
  const kolomTerisi = header.length
  const kolomKeputusan = header.length + 1
  centerCols.push(kolomTerisi, kolomKeputusan)
  header.push("Terisi", "Keputusan")
  groups.push({ label: "Hasil", from: kolomTerisi, to: kolomKeputusan, color: "334155" })

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
    title: "Rekap Raport Observasi SD",
    header,
    rows: body,
    centerCols,
    fixedWidths,
    freezeCols: 2,
    groups,
    tone: (c, v) => {
      if (c === kolomTerisi) return toneTerisi(v)
      if (c === kolomKeputusan) return TONE_KEPUTUSAN[String(v)]
      return penilaian.get(c)?.[String(v)]
    },
  })
}

const TONE_QURAN: Record<string, Tone> = { A: GOOD, B: WARN, C: BAD }

/** Ekspor rekap observasi Al-Qur'an sesuai baris yang sedang tampil. */
export async function eksporRekapQuran(rows: { nama: string; level: string; gelombang: number; nilai: string | null; catatan: string; dinilaiOleh: string }[]) {
  const header = ["No", "Nama", "Jenjang", "Gelombang", "Nilai (A/B/C)", "Catatan", "Dinilai oleh"]
  const body: Cell[][] = rows.map((r, idx) => [idx + 1, r.nama, r.level, r.gelombang, r.nilai ?? "", r.catatan, r.dinilaiOleh])

  await unduhXlsx({
    fileName: "Rekap_Observasi_Al-Quran",
    sheetName: "Al-Quran",
    title: "Rekap Observasi Al-Qur'an",
    header,
    rows: body,
    centerCols: [0, 2, 3, 4],
    fixedWidths: { 0: 5, 5: 50 },
    freezeCols: 2,
    tone: (c, v) => (c === 4 ? TONE_QURAN[String(v)] : undefined),
  })
}

const TONE_PREDIKAT: Record<string, Tone> = {
  "Sangat Baik": GOOD,
  Baik: GOOD,
  Cukup: WARN,
  "Perlu Bimbingan": BAD,
  "Belum Ujian": WARN,
}

/** Nilai 0-100 sesuai batas predikat di getGradeAkademik: >=71 baik, >=56 cukup, selain itu perlu bimbingan. */
function toneNilai(v: Cell): Tone | undefined {
  if (typeof v !== "number") return undefined
  return v >= 71 ? GOOD : v >= 56 ? WARN : BAD
}

/** Ekspor rekap hasil tes akademik calon siswa SMP ke Excel. */
export async function eksporRekapAkademikSmp(rows: RekapAkademikSmpRow[]) {
  const header = [
    "No",
    "Nama Siswa",
    "Asal Sekolah",
    "Pewawancara",
    "Gelombang",
    "Tahun Ajaran",
    "Status Ujian",
    "Nilai Akhir",
    "Predikat",
    "B. Indonesia (%)",
    "Matematika (%)",
    "B. Inggris (%)",
    "Agama Islam (%)",
    "IPA (%)",
    "Keputusan",
  ]

  const body: Cell[][] = rows.map((r, idx) => [
    idx + 1,
    r.nama,
    r.asalSekolah,
    r.guru,
    `Gelombang ${r.gelombang}`,
    r.academicYear ?? "-",
    r.sudahUjian ? "Sudah Ujian" : "Belum Ujian",
    r.totalScore !== null ? Math.round(r.totalScore) : "-",
    r.predikat ?? "-",
    r.subjectScores["Bahasa Indonesia"]?.percent ?? "-",
    r.subjectScores["Matematika"]?.percent ?? "-",
    r.subjectScores["Bahasa Inggris"]?.percent ?? "-",
    r.subjectScores["Agama Islam"]?.percent ?? "-",
    r.subjectScores["IPA"]?.percent ?? "-",
    r.keputusan ?? "-",
  ])

  await unduhXlsx({
    fileName: "Rekap_Tes_Akademik_SMP",
    sheetName: "Tes Akademik SMP",
    title: "Rekap Tes Akademik SMP",
    header,
    rows: body,
    centerCols: [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    fixedWidths: { 0: 5, 1: 30, 2: 25, 3: 20 },
    freezeCols: 2,
    groups: [
      { label: "Data Siswa", from: 0, to: 5, color: BRAND },
      { label: "Hasil Tes", from: 6, to: 13, color: "2563EB" },
      { label: "Keputusan", from: 14, to: 14, color: "334155" },
    ],
    tone: (c, v) => {
      if (c === 6) return v === "Sudah Ujian" ? GOOD : WARN
      if (c === 7 || (c >= 9 && c <= 13)) return toneNilai(v)
      if (c === 8) return TONE_PREDIKAT[String(v)]
      if (c === 14) return TONE_KEPUTUSAN[String(v)]
      return undefined
    },
  })
}
