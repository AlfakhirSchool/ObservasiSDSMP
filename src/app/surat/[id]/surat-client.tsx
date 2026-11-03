"use client"

import { useState } from "react"
import { Noto_Serif } from "next/font/google"
import toast from "react-hot-toast"
import {
  SURAT_STATUS_OPTIONS,
  SURAT_UNIT,
  defaultPenutup,
  formatNilai,
  formatTanggalIso,
  parseBold,
  predikat,
  rataRata,
  type SuratData,
  type SuratNilai,
  type SuratStatus,
} from "@/lib/surat"
import { buildSuratPdf, loadSuratAssets, suratFileName } from "@/lib/surat-pdf"
import "./surat.css"

const notoSerif = Noto_Serif({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"] })

export type SuratDraft = Omit<SuratData, "status" | "penutup"> & { status: SuratStatus | "" }

interface SuratClientProps {
  initial: SuratDraft
}

export default function SuratClient({ initial }: SuratClientProps) {
  const [draft, setDraft] = useState<SuratDraft>(initial)
  /** Teks penutup yang diubah manual; null = pakai teks bawaan sesuai keputusan. */
  const [penutupEdit, setPenutupEdit] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const update = <K extends keyof SuratDraft>(key: K, value: SuratDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const updateNilai = (index: number, patch: Partial<SuratNilai>) =>
    update(
      "nilai",
      draft.nilai.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )

  const unit = SURAT_UNIT[draft.unit]
  const penutup = penutupEdit ?? (draft.status ? defaultPenutup(draft.status, draft.tahunAjaran, draft.unit) : "")
  const rata = rataRata(draft.nilai)

  const kurang = !draft.nomor.trim()
    ? "Isi nomor surat."
    : !draft.nim.trim()
      ? "Isi NIM siswa; NIM dipakai sebagai kata sandi PDF."
      : !draft.status
        ? "Pilih keputusan."
        : !draft.kepalaSekolah.trim()
          ? "Isi nama kepala sekolah."
          : unit.adaNilai && draft.nilai.length === 0
            ? "Tambahkan minimal satu nilai mata uji."
            : null

  const download = async () => {
    if (kurang || !draft.status) return
    setDownloading(true)
    try {
      const doc = await buildSuratPdf({ ...draft, status: draft.status, penutup }, await loadSuratAssets(draft.unit))
      doc.save(suratFileName(draft.nama))
      toast.success("PDF berhasil diunduh")
    } catch {
      toast.error("Gagal membuat PDF")
    } finally {
      setDownloading(false)
    }
  }

  return (
    // Warna aksen kop mengikuti unit lewat custom property CSS (tidak ada tipe bawaannya di CSSProperties).
    <div className={`surat-page ${notoSerif.className}`} style={{ "--surat-accent": unit.aksen } as React.CSSProperties}>
      <div className="surat-toolbar">
        <h1>Surat Hasil Observasi dan Asesmen — {draft.nama}</h1>
        <p className="surat-hint">
          Ubah isi di bawah ini, pratinjau surat langsung berubah. PDF yang diunduh dikunci dengan NIM siswa sebagai kata sandi.
        </p>

        <div className="surat-fields">
          <div className="surat-field">
            <label htmlFor="surat-nomor">Nomor surat</label>
            <input
              id="surat-nomor"
              value={draft.nomor}
              onChange={(e) => update("nomor", e.target.value)}
              placeholder={`04.108/B-${draft.unit}/AL-FAKHIR/II/2026`}
            />
          </div>
          <div className="surat-field">
            <label htmlFor="surat-tanggal">Tanggal surat</label>
            <input id="surat-tanggal" type="date" value={draft.tanggal} onChange={(e) => update("tanggal", e.target.value)} />
          </div>
          <div className="surat-field">
            <label htmlFor="surat-nama">Nama siswa</label>
            <input id="surat-nama" value={draft.nama} onChange={(e) => update("nama", e.target.value)} />
          </div>
          <div className="surat-field">
            <label htmlFor="surat-nim">NIM (kata sandi PDF)</label>
            <input id="surat-nim" value={draft.nim} onChange={(e) => update("nim", e.target.value)} inputMode="numeric" autoComplete="off" />
          </div>
          <div className="surat-field">
            <label htmlFor="surat-gelombang">Jalur penerimaan</label>
            <input id="surat-gelombang" value={draft.gelombang} onChange={(e) => update("gelombang", e.target.value)} />
          </div>
          <div className="surat-field">
            <label htmlFor="surat-tahun">Tahun ajaran</label>
            <input id="surat-tahun" value={draft.tahunAjaran} onChange={(e) => update("tahunAjaran", e.target.value)} />
          </div>
          <div className="surat-field">
            <label htmlFor="surat-pelaksanaan">{unit.adaNilai ? "Tanggal pelaksanaan" : "Tanggal observasi"}</label>
            <input
              id="surat-pelaksanaan"
              value={draft.tanggalPelaksanaan}
              onChange={(e) => update("tanggalPelaksanaan", e.target.value)}
            />
          </div>
          <div className="surat-field">
            <label htmlFor="surat-status">Keputusan</label>
            <select
              id="surat-status"
              value={draft.status}
              onChange={(e) => update("status", e.target.value as SuratStatus | "")}
            >
              <option value="">Pilih keputusan</option>
              {SURAT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="surat-field">
            <label htmlFor="surat-kepsek">Kepala sekolah</label>
            <input id="surat-kepsek" value={draft.kepalaSekolah} onChange={(e) => update("kepalaSekolah", e.target.value)} />
          </div>
        </div>

        {unit.adaNilai && (
        <fieldset className="surat-nilai">
          <legend>Nilai mata uji</legend>
          {draft.nilai.map((row, i) => (
            <div className="surat-nilai-row" key={i}>
              <input
                aria-label={`Mata uji ${i + 1}`}
                value={row.mapel}
                onChange={(e) => updateNilai(i, { mapel: e.target.value })}
              />
              <input
                aria-label={`Nilai ${row.mapel || i + 1}`}
                type="number"
                min={0}
                max={100}
                value={row.nilai}
                onChange={(e) => updateNilai(i, { nilai: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
              />
              <button
                type="button"
                className="surat-btn-ghost"
                aria-label={`Hapus ${row.mapel || `baris ${i + 1}`}`}
                onClick={() =>
                  update(
                    "nilai",
                    draft.nilai.filter((_, idx) => idx !== i)
                  )
                }
              >
                Hapus
              </button>
            </div>
          ))}
          <button
            type="button"
            className="surat-btn-ghost"
            onClick={() => update("nilai", [...draft.nilai, { mapel: "", nilai: 0 }])}
          >
            + Tambah mata uji
          </button>
        </fieldset>
        )}

        <div className="surat-field" style={{ marginTop: 12 }}>
          <label htmlFor="surat-penutup">Paragraf setelah keputusan (tulis **teks** untuk huruf tebal)</label>
          <textarea
            id="surat-penutup"
            rows={4}
            value={penutup}
            onChange={(e) => setPenutupEdit(e.target.value)}
            disabled={!draft.status}
            placeholder="Pilih keputusan terlebih dahulu"
          />
          {penutupEdit !== null && (
            <button type="button" className="surat-btn-ghost" onClick={() => setPenutupEdit(null)}>
              Kembalikan teks bawaan
            </button>
          )}
        </div>

        <div className="surat-actions">
          <button type="button" className="surat-btn" onClick={download} disabled={Boolean(kurang) || downloading}>
            {downloading ? "Membuat PDF..." : "Unduh PDF"}
          </button>
          <button type="button" className="surat-btn surat-btn-secondary" onClick={() => window.print()}>
            Cetak
          </button>
          {kurang && <span className="surat-warn">{kurang}</span>}
        </div>
      </div>

      <main className="surat-sheet">
        <header>
          <div className="surat-kop">
            <img src={unit.logo} alt={`Logo ${unit.nama}`} />
            <div className="surat-kop-text">
              <div className="surat-kop-yayasan">YAYASAN PRESTASI BELIA INDONESIA</div>
              <div className="surat-kop-nama">{unit.namaKop}</div>
              <div className="surat-kop-alamat">Jl. Kemang Raya RT.003/RW.006, Pasir Putih, Sawangan, Depok 16519</div>
              <div className="surat-kop-alamat">Telp. 0852 8175 2123 &nbsp;|&nbsp; Surel: smpialfakhir@gmail.com</div>
            </div>
          </div>
          <div className="surat-garis-kop" />
        </header>

        <div className="surat-meta-row">
          <div className="surat-kv">
            <div>Nomor</div>
            <div>:</div>
            <div>{draft.nomor}</div>
            <div>Perihal</div>
            <div>:</div>
            <div className="surat-tebal">
              Hasil Observasi{unit.adaNilai ? " dan Asesmen" : ""} PPDB {draft.gelombang}
            </div>
          </div>
          <div>Depok, {formatTanggalIso(draft.tanggal)}</div>
        </div>

        <div className="surat-blok">
          <div>Kepada Yth.</div>
          <div>Bapak/Ibu Orang Tua/Wali Calon Peserta Didik</div>
          <div>di Tempat</div>
        </div>

        <div className="surat-salam">Assalamu’alaikum warahmatullahi wabarakatuh,</div>

        <p>
          Dengan hormat, melalui surat ini kami sampaikan hasil observasi{unit.adaNilai ? " dan asesmen" : ""} Penerimaan Peserta
          Didik Baru {unit.nama} Tahun Ajaran {draft.tahunAjaran} atas nama:
        </p>

        <div className="surat-kv identitas">
          <div>Nama</div>
          <div>:</div>
          <div className="surat-tebal">{draft.nama}</div>
          <div>NIM</div>
          <div>:</div>
          <div>{draft.nim}</div>
          <div>Jalur penerimaan</div>
          <div>:</div>
          <div>{draft.gelombang}</div>
          <div>{unit.adaNilai ? "Tanggal pelaksanaan" : "Tanggal observasi"}</div>
          <div>:</div>
          <div>{draft.tanggalPelaksanaan}</div>
        </div>

        {draft.nilai.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th className="surat-col-no">No.</th>
                  <th className="kiri">Mata Uji</th>
                  <th className="surat-col-nilai">Nilai</th>
                  <th className="surat-col-nilai">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {draft.nilai.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}.</td>
                    <td className="kiri">{row.mapel}</td>
                    <td>{row.nilai}</td>
                    <td>{predikat(row.nilai)}</td>
                  </tr>
                ))}
                {rata !== null && (
                  <tr className="ringkas">
                    <td colSpan={2}>Rata-rata</td>
                    <td>{formatNilai(rata)}</td>
                    <td>{predikat(rata)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="surat-keterangan">
              <span className="surat-miring">Keterangan:</span> A = 86–100; &nbsp;B = 71–85; &nbsp;C = 56–70; &nbsp;D = kurang
              dari 56.
            </div>
          </>
        )}

        <p style={{ marginTop: 16 }}>
          Berdasarkan hasil {unit.kataHasil} tersebut, Ananda <span className="surat-tebal">{draft.nama}</span>{" "}
          dinyatakan:
        </p>

        <div className="surat-status">{draft.status}</div>

        <p style={{ marginTop: 10 }}>
          {parseBold(penutup).map((seg, i) =>
            seg.bold ? (
              <span key={i} className="surat-tebal">
                {seg.text}
              </span>
            ) : (
              seg.text
            )
          )}
        </p>

        <div className="surat-salam" style={{ marginTop: 10 }}>
          Wassalamu’alaikum warahmatullahi wabarakatuh.
        </div>

        <div className="surat-ttd">
          <div>Hormat kami,</div>
          <div>Kepala {unit.nama}</div>
          <div className="surat-ttd-ruang" />
          <div className="surat-ttd-nama">{draft.kepalaSekolah}</div>
        </div>
      </main>
    </div>
  )
}
