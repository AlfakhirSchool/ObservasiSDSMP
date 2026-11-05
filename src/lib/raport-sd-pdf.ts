import type { jsPDF as JsPDF } from "jspdf"
import {
  SD_ASPEK,
  SD_TEKS,
  keputusanSegmen,
  romawi,
  tanggalDwibahasa,
  type Bahasa,
  type RaportSdData,
} from "@/lib/raport-sd"
import type { RichSegment } from "@/lib/surat"
import { blobToDataUrl, fetchBlob, loadFonts, type FontStyle } from "@/lib/surat-pdf"

/**
 * Raport digambar dengan koordinat piksel CSS (A4 = 793,7 x 1122,5 px) lalu dikonversi ke mm,
 * sama seperti surat-pdf.ts. Font Noto Serif (subset Latin) disematkan.
 */
const MM = 25.4 / 96
const mm = (px: number) => px * MM
const PT = (px: number) => px * 0.75

const PAGE_W = 793.7
const PAGE_H = 1122.5
const PAD_X = 90
const LEFT = PAD_X
const CONTENT_W = PAGE_W - PAD_X * 2
const TOP = 128 // awal isi di bawah logo kop
const BOTTOM = PAGE_H - 64
const LOGO_W = 96
const LOGO_TOP = 40

const FS = 13
const LH = 20
const TABLE_FS = 12.5
const TABLE_LH = 17
const CELL_PAD_X = 6
const CELL_PAD_Y = 2.5
const LINE_W = 0.75
const INK: [number, number, number] = [17, 17, 17]
const RULE: [number, number, number] = [40, 40, 40]

export interface RaportSdAssets {
  /** Data URL PNG logo kop. */
  logo: string
  /** Base64 TTF Noto Serif. */
  fonts: { regular: string; bold: string; italic: string }
  /** Data URL PNG tanda tangan/stempel; null bila belum diunggah admin. */
  ttdKepsek: string | null
  stempel: string | null
  ttdKetua: string | null
}

const LOGO_URL = "/logo-sd-raport.png"
const ASSET_API = "/api/raport-assets/"

let logoPromise: Promise<string> | null = null

function loadLogo() {
  logoPromise ??= fetchBlob(LOGO_URL).then(blobToDataUrl)
  logoPromise.catch(() => {
    logoPromise = null
  })
  return logoPromise
}

/** 404/403 -> null (belum ada atau bukan admin); galat jaringan dilempar agar tidak dianggap "belum ada". */
async function fetchAsset(key: string): Promise<string | null> {
  const res = await fetch(`${ASSET_API}${key}`)
  return res.ok ? blobToDataUrl(await res.blob()) : null
}

/**
 * Logo, font, dan gambar tanda tangan/stempel. Logo dan font di-cache di modul; gambar tanda tangan
 * diambil ulang tiap pemanggilan supaya unggahan admin terbaru ikut terpakai. Hanya untuk browser.
 */
export async function loadRaportSdAssets(): Promise<RaportSdAssets> {
  const [logo, fonts, ttdKepsek, stempel, ttdKetua] = await Promise.all([
    loadLogo(),
    loadFonts(),
    fetchAsset("sd-ttd-kepsek"),
    fetchAsset("sd-stempel"),
    fetchAsset("sd-ttd-ketua"),
  ])
  return { logo, fonts, ttdKepsek, stempel, ttdKetua }
}

/** Noto Serif subset tidak memuat aksen Latin Extended-A (mis. ā pada "Alhamdulillāh"): ganti dengan huruf dasarnya. */
const norm = (s: string) => s.replace(/[\u0100-\u024f]/g, (c) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))

const baseline = (lineTop: number, lineH: number, fontPx: number) => lineTop + lineH / 2 + 0.35 * fontPx

interface Word {
  text: string
  style: FontStyle
  width: number
}

export async function buildRaportSdPdf(d: RaportSdData, assets: RaportSdAssets, opts?: { encrypt?: boolean }): Promise<JsPDF> {
  // Dinamis: jspdf besar dan hanya dipakai di browser saat tombol unduh ditekan (tidak ikut SSR/bundle awal).
  const { jsPDF } = await import("jspdf")

  const encrypt = opts?.encrypt !== false
  const nim = d.nim.trim()
  if (encrypt && !nim) throw new Error("NIM wajib diisi karena dipakai sebagai kata sandi PDF")
  const ownerPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    // Kata sandi untuk membuka PDF = NIM siswa. Pemilik (acak) menahan perubahan izin; yang tersisa hanya cetak.
    ...(encrypt ? { encryption: { userPassword: nim, ownerPassword, userPermissions: ["print" as const] } } : {}),
  })
  // Judul PDF terenkripsi diacak jsPDF bila ada karakter non-ASCII (mis. em dash, nama beraksen): pakai ASCII saja.
  doc.setProperties({ title: `Raport Observasi SD - ${d.nama}`.replace(/[^\x20-\x7E]/g, "") })

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

  const font = (style: FontStyle, px = FS) => {
    doc.setFont("NotoSerif", style)
    doc.setFontSize(PT(px))
    doc.setTextColor(...INK)
  }
  const textW = (text: string, style: FontStyle, px: number) => {
    font(style, px)
    return doc.getTextWidth(text) / MM
  }

  // ===== Halaman & kop =====
  const logoProps = doc.getImageProperties(assets.logo)
  const logoH = (LOGO_W * logoProps.height) / logoProps.width
  let top = TOP
  let firstPage = true
  const newPage = () => {
    if (!firstPage) doc.addPage()
    firstPage = false
    doc.addImage(assets.logo, "PNG", mm(LEFT), mm(LOGO_TOP), mm(LOGO_W), mm(logoH))
    top = TOP
  }
  const ensure = (h: number) => {
    if (top + h > BOTTOM) newPage()
  }

  // ===== Teks =====
  const layout = (segments: RichSegment[], width: number, px: number): { lines: Word[][]; space: number } => {
    const words: Word[] = []
    for (const seg of segments) {
      const style: FontStyle = seg.bold ? "bold" : "normal"
      for (const text of norm(seg.text).split(/\s+/).filter(Boolean)) {
        words.push({ text, style, width: textW(text, style, px) })
      }
    }
    const space = textW(" ", "normal", px)
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
    return { lines, space }
  }

  /** Satu baris kata; `justify` merenggangkan spasi agar rata kiri-kanan. */
  const drawLine = (line: Word[], space: number, lineTop: number, x: number, width: number, px: number, lh: number, justify: boolean) => {
    const natural = line.reduce((sum, w) => sum + w.width, 0)
    const gaps = line.length - 1
    const gap = justify && gaps > 0 ? (width - natural) / gaps : space
    const y = mm(baseline(lineTop, lh, px))
    let cx = x
    for (const w of line) {
      font(w.style, px)
      doc.text(w.text, mm(cx), y)
      cx += w.width + gap
    }
  }

  /** Paragraf rata kiri-kanan yang boleh pindah halaman di antara baris (minimal 2 baris di tiap sisi bila memungkinkan). */
  const flow = (segments: RichSegment[], after = 10) => {
    const { lines, space } = layout(segments, CONTENT_W, FS)
    if (lines.length === 0) return
    ensure(Math.min(lines.length, 2) * LH)
    lines.forEach((line, i) => {
      if (i === lines.length - 2 && lines.length > 3) ensure(2 * LH)
      ensure(LH)
      drawLine(line, space, top, LEFT, CONTENT_W, FS, LH, i < lines.length - 1)
      top += LH
    })
    top += after
  }
  const plain = (text: string, bold = false): RichSegment[] => [{ text, bold }]

  const title = (lines: readonly string[], gap: number) => {
    lines.forEach((t, i) => {
      const text = fill(t)
      let px = 14
      const w = textW(text, "bold", px)
      if (w > CONTENT_W) px = (px * CONTENT_W) / w
      font("bold", px)
      doc.text(text, mm(PAGE_W / 2), mm(baseline(top, 24, px)), { align: "center" })
      top += 24 + (i === 0 ? gap : 0)
    })
  }

  /** Ganti `{jumlah}` dan `{gelombang}` pada teks tetap. */
  const fill = (s: string) => norm(s.replaceAll("{jumlah}", String(d.jumlahSiswa)).replaceAll("{gelombang}", romawi(d.gelombang)))

  // ===== Halaman deskripsi =====
  const deskripsi = (bahasa: Bahasa) => {
    const t = SD_TEKS[bahasa].deskripsi
    newPage()
    title(t.judul, 2)
    top += 22
    for (const p of t.pembuka) if (p) flow(plain(fill(p)))
    top += 2
    flow(plain(fill(t.aspekDiobservasi)), 6)

    SD_ASPEK.forEach((aspek, i) => {
      const heading = `${i + 1}. ${aspek.judul[bahasa]}`
      ensure(LH + 8 + Math.min(layout(plain(aspek.cakupan[bahasa]), CONTENT_W, FS).lines.length, 2) * LH)
      top += 6
      flow(plain(heading, true), 4)
      flow(plain(aspek.cakupan[bahasa]), 8)
      for (const nilai of ["baik", "perlu"] as const) {
        flow([
          { text: `${aspek.label[nilai][bahasa]}: `, bold: true },
          { text: aspek.deskripsi[nilai][bahasa], bold: false },
        ])
      }
    })

    if (t.informasiLanjutan) {
      ensure(2 * LH + 20 + LH + 2 * LH)
      top += 14
      flow(plain(fill(t.informasiLanjutan.judul), true), 4)
      flow(plain(fill(t.informasiLanjutan.teks)))
    }

    ensure(LH + 20 + 2 * LH)
    top += 14
    flow(plain(fill(t.penutup.judul), true), 4)
    for (const p of t.penutup.paragraf) flow(plain(fill(p)), 8)
  }

  // ===== Halaman hasil =====
  const imageBox = (url: string, width: number, maxH: number) => {
    const p = doc.getImageProperties(url)
    const scale = Math.min(width / p.width, maxH / p.height)
    return { w: p.width * scale, h: p.height * scale }
  }

  const hasil = (bahasa: Bahasa) => {
    const t = SD_TEKS[bahasa].hasil
    newPage()
    title(t.judul, 8)
    top += 18

    const kv = (label: string, value: string) => {
      const y = mm(baseline(top, LH, FS))
      font("bold")
      doc.text(norm(label), mm(LEFT), y)
      doc.text(`: ${norm(value)}`, mm(LEFT + 112), y)
      top += LH + 4
    }
    kv(t.nama, d.nama)
    if (d.asalSekolah.trim()) kv(t.asalSekolah, d.asalSekolah.trim())
    top += 4

    // ----- Tabel -----
    const col1W = CONTENT_W * 0.75
    const col2W = CONTENT_W - col1W
    const col2X = LEFT + col1W
    const textW1 = col1W - CELL_PAD_X * 2
    const textW2 = col2W - CELL_PAD_X * 2

    const box = (x: number, y: number, w: number, h: number, fillGray?: number) => {
      doc.setDrawColor(...RULE)
      doc.setLineWidth(mm(LINE_W))
      if (fillGray !== undefined) {
        doc.setFillColor(fillGray, fillGray, fillGray)
        doc.rect(mm(x), mm(y), mm(w), mm(h), "FD")
      } else {
        doc.rect(mm(x), mm(y), mm(w), mm(h))
      }
    }
    const cellLines = (text: string, style: FontStyle, width: number) => layout(plain(text, style === "bold"), width, TABLE_FS)

    // header
    const headH = 24
    box(LEFT, top, col1W, headH, 236)
    box(col2X, top, col2W, headH, 236)
    font("bold", 13)
    doc.text(norm(t.kolomIndikator), mm(LEFT + col1W / 2), mm(baseline(top, headH, 13)), { align: "center" })
    doc.text(norm(t.kolomHasil), mm(col2X + col2W / 2), mm(baseline(top, headH, 13)), { align: "center" })
    top += headH

    const aspekRowH = TABLE_LH + CELL_PAD_Y * 2
    d.aspek.forEach((hasilAspek, ai) => {
      const aspek = SD_ASPEK[ai]
      const rows = hasilAspek.indikator.map((ind) => {
        const teks = cellLines(ind.teks[bahasa], "normal", textW1)
        const res = cellLines(ind.hasil[bahasa], "bold", textW2)
        return { teks, res, h: Math.max(teks.lines.length, res.lines.length) * TABLE_LH + CELL_PAD_Y * 2 }
      })

      // judul aspek ditahan bersama baris indikator pertama
      ensure(aspekRowH + (rows[0]?.h ?? 0))
      box(LEFT, top, CONTENT_W, aspekRowH)
      font("bold", TABLE_FS)
      doc.text(norm(aspek.judul[bahasa]), mm(LEFT + CELL_PAD_X), mm(baseline(top + CELL_PAD_Y, TABLE_LH, TABLE_FS)))
      top += aspekRowH

      const cat = layout(plain(hasilAspek.catatan[bahasa]), CONTENT_W - CELL_PAD_X * 2, TABLE_FS + 0.5)
      const catH = CELL_PAD_Y * 2 + TABLE_LH + 3 + cat.lines.length * TABLE_LH
      rows.forEach((row, ri) => {
        // baris terakhir ditahan bersama kotak catatan agar tidak terpisah halaman
        ensure(ri === rows.length - 1 ? row.h + catH : row.h)
        box(LEFT, top, col1W, row.h)
        box(col2X, top, col2W, row.h)
        row.teks.lines.forEach((line, i) => {
          drawLine(line, row.teks.space, top + CELL_PAD_Y + i * TABLE_LH, LEFT + CELL_PAD_X, textW1, TABLE_FS, TABLE_LH, false)
        })
        row.res.lines.forEach((line, i) => {
          const w = line.reduce((s, x) => s + x.width, 0) + (line.length - 1) * row.res.space
          drawLine(line, row.res.space, top + CELL_PAD_Y + i * TABLE_LH, col2X + col2W / 2 - w / 2, w, TABLE_FS, TABLE_LH, false)
        })
        top += row.h
      })

      // catatan: label tebal, lalu teks rata kiri-kanan
      box(LEFT, top, CONTENT_W, catH)
      font("bold", TABLE_FS)
      doc.text(norm(t.catatan), mm(LEFT + CELL_PAD_X), mm(baseline(top + CELL_PAD_Y, TABLE_LH, TABLE_FS)))
      cat.lines.forEach((line, i) => {
        drawLine(line, cat.space, top + CELL_PAD_Y + TABLE_LH + 3 + i * TABLE_LH, LEFT + CELL_PAD_X, CONTENT_W - CELL_PAD_X * 2, TABLE_FS + 0.5, TABLE_LH, i < cat.lines.length - 1)
      })
      top += catH
    })

    // ----- Keputusan + tanda tangan (satu halaman) -----
    const keputusan = layout(keputusanSegmen(bahasa, d.nama, d.status), CONTENT_W, FS)
    const SIG_SPACE = 96
    const blockH = 18 + keputusan.lines.length * LH + 14 + LH + 2 * LH + SIG_SPACE + LH
    ensure(blockH)
    top += 18
    keputusan.lines.forEach((line, i) => {
      drawLine(line, keputusan.space, top, LEFT, CONTENT_W, FS, LH, i < keputusan.lines.length - 1)
      top += LH
    })
    top += 14

    const rightX = LEFT + CONTENT_W * 0.62
    font("normal")
    doc.text(norm(`Depok, ${tanggalDwibahasa(d.tanggal)[bahasa]}`), mm(rightX), mm(baseline(top, LH, FS)))
    top += LH
    doc.text(norm(t.mengetahui), mm(LEFT), mm(baseline(top, LH, FS)))
    top += LH
    doc.text(norm(t.kepalaSekolah), mm(LEFT), mm(baseline(top, LH, FS)))
    doc.text(norm(t.ketuaPelaksana), mm(rightX), mm(baseline(top, LH, FS)))
    top += LH

    const nameTop = top + SIG_SPACE
    const maxH = SIG_SPACE + 14
    // Tanda tangan dan stempel menumpuk di atas nama (bagian bawahnya sedikit menutup nama, seperti contoh).
    const place = (url: string | null, width: number, x: number) => {
      if (!url) return
      const b = imageBox(url, width, maxH)
      doc.addImage(url, "PNG", mm(x), mm(nameTop + 4 - b.h), mm(b.w), mm(b.h))
    }
    place(assets.ttdKepsek, 150, LEFT)
    place(assets.stempel, 90, LEFT + 78)
    place(assets.ttdKetua, 110, rightX)

    font("bold")
    const names: [string, number][] = [
      [norm(d.kepalaSekolah), LEFT],
      [norm(d.ketuaPelaksana), rightX],
    ]
    const y = mm(baseline(nameTop, LH, FS))
    doc.setDrawColor(...INK)
    doc.setLineWidth(mm(1))
    for (const [name, x] of names) {
      doc.text(name, mm(x), y)
      doc.line(mm(x), y + mm(3), mm(x) + doc.getTextWidth(name), y + mm(3))
    }
    top = nameTop + LH
  }

  deskripsi("en")
  deskripsi("id")
  hasil("en")
  hasil("id")
  return doc
}

export function raportSdFileName(nama: string) {
  const safe = nama.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "Siswa"
  return `Raport_Observasi_SD_${safe}.pdf`
}
