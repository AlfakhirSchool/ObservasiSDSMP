import type { jsPDF as JsPDF } from "jspdf"
import {
  SURAT_UNIT,
  formatNilai,
  formatTanggalIso,
  parseBold,
  predikat,
  rataRata,
  type RichSegment,
  type SuratData,
  type SuratUnit,
} from "@/lib/surat"

/**
 * Surat digambar dengan koordinat piksel CSS yang sama dengan template HTML (A4 = 793,7 x 1122,5 px),
 * lalu dikonversi ke mm. Font Noto Serif (subset Latin) disematkan agar tampilannya sama dengan template.
 */
const MM = 25.4 / 96
const mm = (px: number) => px * MM
const PT = (px: number) => px * 0.75

const PAGE_W = 793.7
const PAD_X = 76
const CONTENT_W = PAGE_W - PAD_X * 2
const LEFT = PAD_X
const RIGHT = PAGE_W - PAD_X
const LH = 22.4 // 14px * 1.6
const FS = 14
const INK: [number, number, number] = [17, 17, 17]
const RULE: [number, number, number] = [51, 51, 51]

export interface SuratAssets {
  logo: string
  /** Base64 TTF Noto Serif. */
  fonts: { regular: string; bold: string; italic: string }
}

const FONT_URLS = {
  regular: "/fonts/NotoSerif-regular.ttf",
  bold: "/fonts/NotoSerif-bold.ttf",
  italic: "/fonts/NotoSerif-italic.ttf",
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>()
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
  return promise
}

export async function fetchBlob(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Gagal memuat ${url}`)
  return res.blob()
}

let fontsPromise: Promise<SuratAssets["fonts"]> | null = null
const logoPromises: Partial<Record<SuratUnit, Promise<string>>> = {}

export function loadFonts() {
  fontsPromise ??= (async () => {
    const [regular, bold, italic] = await Promise.all(
      [FONT_URLS.regular, FONT_URLS.bold, FONT_URLS.italic].map(async (url) => {
        const dataUrl = await blobToDataUrl(await fetchBlob(url))
        return dataUrl.slice(dataUrl.indexOf(",") + 1)
      })
    )
    return { regular, bold, italic }
  })()
  fontsPromise.catch(() => {
    fontsPromise = null
  })
  return fontsPromise
}

function loadLogo(unit: SuratUnit) {
  logoPromises[unit] ??= fetchBlob(SURAT_UNIT[unit].logo).then(blobToDataUrl)
  logoPromises[unit]?.catch(() => {
    delete logoPromises[unit]
  })
  return logoPromises[unit] as Promise<string>
}

/** Logo unit dan font surat (di-cache). Hanya untuk browser. */
export async function loadSuratAssets(unit: SuratUnit): Promise<SuratAssets> {
  const [logo, fonts] = await Promise.all([loadLogo(unit), loadFonts()])
  return { logo, fonts }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export type FontStyle = "normal" | "bold" | "italic"

/** Posisi baseline di dalam kotak baris CSS: tengah kotak + ~0,35 x ukuran font. */
const baseline = (lineTop: number, lineH: number, fontPx: number) => lineTop + lineH / 2 + 0.35 * fontPx

function font(doc: JsPDF, style: FontStyle, px = FS, color: [number, number, number] = INK) {
  doc.setFont("NotoSerif", style)
  doc.setFontSize(PT(px))
  doc.setTextColor(...color)
}

interface Word {
  text: string
  style: FontStyle
  width: number
}

/**
 * Paragraf rata kiri-kanan dengan potongan tebal/biasa. Baris terakhir rata kiri (seperti text-align: justify).
 * Mengembalikan tinggi paragraf dalam px.
 */
function paragraph(doc: JsPDF, segments: RichSegment[], top: number, x = LEFT, width = CONTENT_W): number {
  const words: Word[] = []
  for (const seg of segments) {
    const style: FontStyle = seg.bold ? "bold" : "normal"
    font(doc, style)
    for (const text of seg.text.split(/\s+/).filter(Boolean)) {
      words.push({ text, style, width: doc.getTextWidth(text) / MM })
    }
  }
  font(doc, "normal")
  const space = doc.getTextWidth(" ") / MM

  const lines: Word[][] = []
  let line: Word[] = []
  let lineW = 0
  for (const w of words) {
    const next = line.length === 0 ? w.width : lineW + space + w.width
    if (next > width && line.length > 0) {
      lines.push(line)
      line = [w]
      lineW = w.width
    } else {
      line.push(w)
      lineW = next
    }
  }
  if (line.length > 0) lines.push(line)

  lines.forEach((l, i) => {
    const y = baseline(top + i * LH, LH, FS)
    const natural = l.reduce((sum, w) => sum + w.width, 0)
    const gaps = l.length - 1
    const last = i === lines.length - 1
    const gap = !last && gaps > 0 ? (width - natural) / gaps : space
    let cx = x
    for (const w of l) {
      font(doc, w.style)
      doc.text(w.text, mm(cx), mm(y))
      cx += w.width + gap
    }
  })
  return lines.length * LH
}

/** Menggambar surat A4 satu halaman dan mengembalikan dokumennya. Hanya untuk browser. */
export async function buildSuratPdf(d: SuratData, assets: SuratAssets): Promise<JsPDF> {
  // Dinamis: jspdf besar dan hanya dipakai di browser saat tombol unduh ditekan (tidak ikut SSR/bundle awal).
  const { jsPDF } = await import("jspdf")
  const unit = SURAT_UNIT[d.unit]
  const accent = hexToRgb(unit.aksen)

  const nim = d.nim.trim()
  if (!nim) throw new Error("NIM wajib diisi karena dipakai sebagai kata sandi PDF")
  const ownerPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    // Kata sandi untuk membuka PDF = NIM siswa. Pemilik (acak) menahan perubahan izin; yang tersisa hanya cetak.
    encryption: { userPassword: nim, ownerPassword, userPermissions: ["print"] },
  })
  // Judul PDF terenkripsi diacak jsPDF bila ada karakter non-ASCII (mis. em dash, nama beraksen): pakai ASCII saja.
  doc.setProperties({ title: `Surat Hasil Observasi dan Asesmen - ${d.nama}`.replace(/[^\x20-\x7E]/g, "") })

  const styles: [FontStyle, string][] = [
    ["normal", assets.fonts.regular],
    ["bold", assets.fonts.bold],
    ["italic", assets.fonts.italic],
  ]
  for (const [style, base64] of styles) {
    const file = `NotoSerif-${style}.ttf`
    doc.addFileToVFS(file, base64)
    doc.addFont(file, "NotoSerif", style)
  }

  // ===== Kop surat =====
  const kopTop = 44
  const kopH = 88
  const logoProps = doc.getImageProperties(assets.logo)
  // object-fit: contain di kotak 84 x 88.
  const scale = Math.min(84 / logoProps.width, kopH / logoProps.height)
  const logoW = logoProps.width * scale
  const logoH = logoProps.height * scale
  doc.addImage(assets.logo, "PNG", mm(LEFT + (84 - logoW) / 2), mm(kopTop + (kopH - logoH) / 2), mm(logoW), mm(logoH))

  const cx = mm(LEFT + 84 + 16 + (CONTENT_W - 84 - 16 - 100) / 2)
  const textTop = kopTop + (kopH - 80.95) / 2
  font(doc, "bold", 12)
  doc.text("YAYASAN PRESTASI BELIA INDONESIA", cx, mm(baseline(textTop, 16.8, 12)), { align: "center", charSpace: mm(0.12 * 12) })
  font(doc, "bold", 23, accent)
  doc.text(unit.namaKop, cx, mm(baseline(textTop + 16.8, 28.75, 23)), { align: "center", charSpace: mm(0.03 * 23) })
  font(doc, "normal", 11.5)
  doc.text("Jl. Kemang Raya RT.003/RW.006, Pasir Putih, Sawangan, Depok 16519", cx, mm(baseline(textTop + 16.8 + 28.75 + 2, 16.7, 11.5)), { align: "center" })
  doc.text("Telp. 0852 8175 2123  |  Surel: smpialfakhir@gmail.com", cx, mm(baseline(textTop + 16.8 + 28.75 + 2 + 16.7, 16.7, 11.5)), { align: "center" })

  // Garis kop: border-top 3px, 1px putih, 1px garis bawah.
  const ruleTop = kopTop + kopH + 12
  doc.setFillColor(...accent)
  doc.rect(mm(LEFT), mm(ruleTop), mm(CONTENT_W), mm(3), "F")
  doc.rect(mm(LEFT), mm(ruleTop + 4), mm(CONTENT_W), mm(1), "F")

  // ===== Nomor / perihal =====
  let top = ruleTop + 5 + 24
  font(doc, "normal")
  const kv = (label: string, value: string, row: number, bold = false) => {
    const y = mm(baseline(top + row * LH, LH, FS))
    font(doc, "normal")
    doc.text(label, mm(LEFT), y)
    doc.text(":", mm(LEFT + 76), y)
    font(doc, bold ? "bold" : "normal")
    doc.text(value, mm(LEFT + 76 + 14), y)
  }
  kv("Nomor", d.nomor, 0)
  kv("Perihal", `Hasil Observasi${unit.adaNilai ? " dan Asesmen" : ""} PPDB ${d.gelombang}`, 1, true)
  font(doc, "normal")
  doc.text(`Depok, ${formatTanggalIso(d.tanggal)}`, mm(RIGHT), mm(baseline(top, LH, FS)), { align: "right" })
  top += 2 * LH

  // ===== Alamat surat =====
  top += 22
  ;["Kepada Yth.", "Bapak/Ibu Orang Tua/Wali Calon Peserta Didik", "di Tempat"].forEach((t, i) => {
    doc.text(t, mm(LEFT), mm(baseline(top + i * LH, LH, FS)))
  })
  top += 3 * LH

  top += 18
  font(doc, "italic")
  doc.text("Assalamu’alaikum warahmatullahi wabarakatuh,", mm(LEFT), mm(baseline(top, LH, FS)))
  top += LH

  // ===== Pembuka =====
  top += 8
  top += paragraph(
    doc,
    [
      {
        text: `Dengan hormat, melalui surat ini kami sampaikan hasil observasi${unit.adaNilai ? " dan asesmen" : ""} Penerimaan Peserta Didik Baru ${unit.nama} Tahun Ajaran ${d.tahunAjaran} atas nama:`,
        bold: false,
      },
    ],
    top
  )

  // ===== Identitas =====
  top += 8
  const idX = LEFT + 28
  const identitas: [string, string, boolean][] = [
    ["Nama", d.nama, true],
    ["NIM", nim, false],
    ["Jalur penerimaan", d.gelombang, false],
    [unit.adaNilai ? "Tanggal pelaksanaan" : "Tanggal observasi", d.tanggalPelaksanaan, false],
  ]
  identitas.forEach(([label, value, bold], i) => {
    const y = mm(baseline(top + i * LH, LH, FS))
    font(doc, "normal")
    doc.text(label, mm(idX), y)
    doc.text(":", mm(idX + 170), y)
    font(doc, bold ? "bold" : "normal")
    doc.text(value, mm(idX + 170 + 14), y)
  })
  top += identitas.length * LH

  // ===== Tabel nilai (hanya jika ada nilai) =====
  if (d.nilai.length > 0) {
    top += 14
    const colW = [46, CONTENT_W - 46 - 96 - 96, 96, 96]
    const colX = colW.reduce<number[]>((acc, _w, i) => [...acc, i === 0 ? LEFT : acc[i - 1] + colW[i - 1]], [])
    // Sedikit lebih rapat dari template (34 / 30,6 / 31,6 px) untuk memberi ruang bagi baris NIM.
    const headH = 32
    const rowH = 28.6
    const avgH = 29.6

    const cell = (text: string, col: number, y: number, h: number, opts: { bold?: boolean; fill?: number; left?: boolean; span?: number }) => {
      const w = opts.span ? colW.slice(col, col + opts.span).reduce((a, b) => a + b, 0) : colW[col]
      doc.setDrawColor(...RULE)
      doc.setLineWidth(mm(1))
      if (opts.fill !== undefined) {
        doc.setFillColor(opts.fill, opts.fill, opts.fill)
        doc.rect(mm(colX[col]), mm(y), mm(w), mm(h), "FD")
      } else {
        doc.rect(mm(colX[col]), mm(y), mm(w), mm(h))
      }
      font(doc, opts.bold ? "bold" : "normal")
      const ty = mm(baseline(y, h, FS))
      if (opts.left) doc.text(text, mm(colX[col] + 12), ty)
      else doc.text(text, mm(colX[col] + w / 2), ty, { align: "center" })
    }

    ;["No.", "Mata Uji", "Nilai", "Predikat"].forEach((t, i) => cell(t, i, top, headH, { bold: true, fill: 236, left: i === 1 }))
    top += headH
    d.nilai.forEach((r, i) => {
      cell(`${i + 1}.`, 0, top, rowH, {})
      cell(r.mapel, 1, top, rowH, { left: true })
      cell(String(r.nilai), 2, top, rowH, {})
      cell(predikat(r.nilai), 3, top, rowH, {})
      top += rowH
    })
    const avg = rataRata(d.nilai)
    if (avg !== null) {
      cell("Rata-rata", 0, top, avgH, { bold: true, fill: 245, span: 2 })
      cell(formatNilai(avg), 2, top, avgH, { bold: true, fill: 245 })
      cell(predikat(avg), 3, top, avgH, { bold: true, fill: 245 })
      top += avgH
    }

    top += 6
    const ky = mm(baseline(top, 18, 12))
    font(doc, "italic", 12)
    doc.text("Keterangan:", mm(LEFT), ky)
    font(doc, "normal", 12)
    doc.text("A = 86–100;  B = 71–85;  C = 56–70;  D = kurang dari 56.", mm(LEFT + 76), ky)
    top += 18
  }

  // ===== Keputusan =====
  top += 16
  top += paragraph(
    doc,
    [
      { text: `Berdasarkan hasil ${unit.kataHasil} tersebut, Ananda `, bold: false },
      { text: d.nama, bold: true },
      { text: " dinyatakan:", bold: false },
    ],
    top
  )

  top += 8
  font(doc, "bold", 18)
  const charSpace = 0.35 * 18
  const statusTextW = doc.getTextWidth(d.status) / MM + d.status.length * charSpace
  const boxW = statusTextW + 88
  const boxLeft = (PAGE_W - boxW) / 2
  doc.setFillColor(...INK)
  doc.rect(mm(boxLeft), mm(top), mm(boxW), mm(1.5), "F")
  doc.rect(mm(boxLeft), mm(top + 36 - 1.5), mm(boxW), mm(1.5), "F")
  // Letter-spacing CSS menambah jarak setelah huruf terakhir juga, jadi teks digeser setengahnya.
  doc.text(d.status, mm(PAGE_W / 2 + charSpace / 2), mm(baseline(top + 1.5 + 3, 27, 18)), {
    align: "center",
    charSpace: mm(charSpace),
  })
  top += 36

  // ===== Penutup =====
  top += 10
  top += paragraph(doc, parseBold(d.penutup), top)
  top += 10
  font(doc, "italic")
  doc.text("Wassalamu’alaikum warahmatullahi wabarakatuh.", mm(LEFT), mm(baseline(top, LH, FS)))
  top += LH

  // ===== Tanda tangan =====
  top += 20
  const sigX = RIGHT - 270
  font(doc, "normal")
  doc.text("Hormat kami,", mm(sigX), mm(baseline(top, LH, FS)))
  doc.text(`Kepala ${unit.nama}`, mm(sigX), mm(baseline(top + LH, LH, FS)))
  const nameTop = top + 2 * LH + 52 // ruang tanda tangan (template 72px) dipersempit agar baris NIM tetap muat satu halaman
  const nameY = mm(baseline(nameTop, LH, FS))
  font(doc, "bold")
  doc.text(d.kepalaSekolah, mm(sigX), nameY)
  const nameW = doc.getTextWidth(d.kepalaSekolah)
  doc.setDrawColor(...INK)
  doc.setLineWidth(mm(1))
  doc.line(mm(sigX), nameY + mm(3), mm(sigX) + nameW, nameY + mm(3))

  return doc
}

export function suratFileName(nama: string) {
  const safe = nama.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "Siswa"
  return `Surat_Hasil_Observasi_${safe}.pdf`
}
