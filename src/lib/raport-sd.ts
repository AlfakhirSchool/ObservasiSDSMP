/**
 * Data & aturan raport "Hasil Observasi Calon Siswa SD" (dua bahasa: Inggris dan Indonesia).
 * Murni (tanpa React/DOM) agar dipakai form guru, API catatan, editor, pembuat PDF, dan unduh massal.
 *
 * Alur: guru menilai 23 indikator di dashboard (disimpan di Candidate.sdRaport, bisa diubah kapan saja),
 * admin mengunduh raport.
 */
import { formatTanggalLong, type RichSegment, type SuratStatus } from "@/lib/surat"

export type Bahasa = "id" | "en"
export type Dwibahasa = Record<Bahasa, string>

export type SdAspekId = "kognitif" | "motorikHalus" | "motorikKasar" | "quran"
/** baik = Berkembang (Al-Qur'an: Berkembang Baik); perlu = Belum Berkembang (Al-Qur'an: Berkembang). */
export type SdNilai = "baik" | "perlu"

export interface SdIndikator {
  kode: string
  teks: Dwibahasa
}

export interface SdAspek {
  id: SdAspekId
  judul: Dwibahasa
  /** Kalimat "Meliputi ..." di halaman deskripsi. */
  cakupan: Dwibahasa
  label: Record<SdNilai, Dwibahasa>
  /** Deskripsi umum per predikat (halaman deskripsi). */
  deskripsi: Record<SdNilai, Dwibahasa>
  /** Catatan bawaan per predikat; `{n}` diganti nama panggilan siswa. */
  catatan: Record<SdNilai, Dwibahasa>
  indikator: SdIndikator[]
}

const LABEL_UMUM: Record<SdNilai, Dwibahasa> = {
  baik: { id: "Berkembang", en: "Developing" },
  perlu: { id: "Belum Berkembang", en: "Need Improvement" },
}

const LABEL_QURAN: Record<SdNilai, Dwibahasa> = {
  baik: { id: "Berkembang Baik", en: "Developing Well" },
  perlu: { id: "Berkembang", en: "Developing" },
}

export const SD_ASPEK: SdAspek[] = [
  {
    id: "kognitif",
    judul: { id: "Kemampuan Kognitif", en: "Cognitive Ability" },
    cakupan: {
      id: "Meliputi kemampuan mengenal huruf dan angka, memahami instruksi sederhana, daya ingat, konsentrasi, serta kemampuan berpikir logis sesuai usia perkembangan anak.",
      en: "This includes the ability to recognize letters and numbers, understand simple instructions, memory skills, concentration, and logical thinking according to the child’s developmental stage.",
    },
    label: LABEL_UMUM,
    deskripsi: {
      baik: {
        id: "Anak menunjukkan kemampuan memahami instruksi dengan baik, mampu mengenali huruf/angka dasar, serta memiliki fokus dan daya tangkap yang sesuai dengan tahapan usianya.",
        en: "The child demonstrates a good understanding of instructions, is able to recognize basic letters/numbers, and shows focus and comprehension appropriate to their age level.",
      },
      perlu: {
        id: "Anak masih memerlukan stimulasi dan pendampingan dalam mengenal huruf/angka, mempertahankan konsentrasi, atau memahami instruksi sederhana.",
        en: "The child still requires stimulation and guidance in recognizing letters/numbers, maintaining concentration, or understanding simple instructions.",
      },
    },
    catatan: {
      baik: {
        id: "{n} menunjukkan kemampuan memahami instruksi dengan baik, mampu mengenali huruf/angka dasar, serta memiliki fokus dan daya tangkap yang sesuai dengan tahapan usianya.",
        en: "{n} demonstrates a good understanding of instructions, is able to recognize basic letters/numbers, and shows focus and comprehension appropriate to their age level.",
      },
      perlu: {
        id: "{n} masih memerlukan stimulasi dan pendampingan dalam mengenal huruf/angka, mempertahankan konsentrasi, atau memahami instruksi sederhana.",
        en: "{n} still requires stimulation and guidance in recognizing letters/numbers, maintaining concentration, or understanding simple instructions.",
      },
    },
    indikator: [
      { kode: "kog1", teks: { id: "Menanyakan nama siswa (nama lengkap)", en: "Ask and say their full name" } },
      { kode: "kog2", teks: { id: "Menanyakan alamat rumah (alamat lengkap)", en: "Ask and say their complete home address" } },
      { kode: "kog3", teks: { id: "Menanyakan nama orangtua (ayah dan ibu)", en: "Ask and say their parents’ names" } },
      { kode: "kog4", teks: { id: "Menanyakan jumlah anggota keluarga", en: "Ask and say the number of family members" } },
      { kode: "kog5", teks: { id: "Menanyakan hobi atau kesukaan", en: "Ask and talk about their hobbies or interests" } },
      { kode: "kog6", teks: { id: "Menanyakan asal sekolah", en: "Ask and say their previous school (kindergarten)" } },
      { kode: "kog7", teks: { id: "Menanyakan teman bermain di sekolah/ di rumah", en: "Ask and say their friends at school or at home" } },
      { kode: "kog8", teks: { id: "Menanyakan berbagai warna (warna primer/min.3 warna)", en: "Ask and name colors (at least 3 primary colors)" } },
      { kode: "kog9", teks: { id: "Menyebutkan angka bilangan (1-10)", en: "Say numbers from 1 to 10" } },
      { kode: "kog10", teks: { id: "Menuliskan angka sesuai urutan", en: "Write numbers in the correct order" } },
      { kode: "kog11", teks: { id: "Membaca kalimat sederhana", en: "Read simple sentences in Bahasa and English" } },
    ],
  },
  {
    id: "motorikHalus",
    judul: { id: "Motorik Halus", en: "Fine Motor Skills" },
    cakupan: {
      id: "Meliputi kemampuan koordinasi tangan dan mata seperti memegang pensil dengan benar, menebalkan garis, dan mewarnai.",
      en: "This includes hand-eye coordination skills such as holding a pencil correctly, tracing lines, and coloring.",
    },
    label: LABEL_UMUM,
    deskripsi: {
      baik: {
        id: "Anak mampu memegang alat tulis dengan cukup baik serta menunjukkan koordinasi tangan-mata yang sesuai dengan usia.",
        en: "The child is able to hold writing tools properly and shows hand-eye coordination appropriate for their age.",
      },
      perlu: {
        id: "Anak masih membutuhkan latihan untuk menguatkan koordinasi tangan dan jari dalam aktivitas menulis dan mewarnai.",
        en: "The child still needs practice to strengthen hand and finger coordination in writing activities or other skill-based tasks (coloring).",
      },
    },
    catatan: {
      baik: {
        id: "{n} mampu memegang alat tulis dengan baik dan menunjukkan koordinasi mata dan tangan yang sesuai dengan usianya.",
        en: "{n} is able to hold writing tools properly and shows hand-eye coordination appropriate for their age.",
      },
      perlu: {
        id: "{n} masih membutuhkan latihan untuk menguatkan koordinasi tangan dan jari dalam aktivitas menulis dan mewarnai.",
        en: "{n} still needs practice to strengthen hand and finger coordination in writing activities or other skill-based tasks (coloring).",
      },
    },
    indikator: [
      {
        kode: "mh1",
        teks: {
          id: "Kemampuan mengontrol gerakan pensil dan crayon saat membuat pola garis",
          en: "Ability to control pencil and crayon movements when making line patterns",
        },
      },
      {
        kode: "mh2",
        teks: {
          id: "Koordinasi tangan dan mata saat melakukan aktivitas (kefokusan)",
          en: "Hand-eye coordination during activities (focus and concentration)",
        },
      },
      { kode: "mh3", teks: { id: "Ketelitian dan kerapian dalam menyelesaikan karya", en: "Accuracy and neatness in completing work" } },
      {
        kode: "mh4",
        teks: {
          id: "Ketekunan dan fokus selama kegiatan berlangsung (tidak lirik dan mengobrol)",
          en: "Perseverance and focus during activities (not easily distracted or talking)",
        },
      },
    ],
  },
  {
    id: "motorikKasar",
    judul: { id: "Motorik Kasar", en: "Gross Motor Skills" },
    cakupan: {
      id: "Meliputi kemampuan gerakan tubuh seperti berjalan jongkok, berjalan zig zag melempar dan menangkap bola.",
      en: "This includes body movements such as walking with balance (squatting), zigzag walking, throwing and catching the ball.",
    },
    label: LABEL_UMUM,
    deskripsi: {
      baik: {
        id: "Anak mampu melakukan gerakan dasar dengan baik, menunjukkan keseimbangan dan koordinasi tubuh yang sesuai dengan usianya.",
        en: "The child is able to perform basic movements well and demonstrates balance and body coordination appropriate for their age.",
      },
      perlu: {
        id: "Anak masih memerlukan stimulasi untuk meningkatkan keseimbangan, koordinasi, dan kekuatan gerak tubuh.",
        en: "The child still requires stimulation to improve balance, coordination, and body strength.",
      },
    },
    catatan: {
      baik: {
        id: "{n} mampu melakukan gerakan dasar dengan baik, menunjukkan keseimbangan dan koordinasi tubuh yang sesuai dengan usianya.",
        en: "{n} is able to perform basic movements well and demonstrates balance and body coordination appropriate for their age.",
      },
      perlu: {
        id: "{n} masih memerlukan stimulasi untuk meningkatkan keseimbangan, koordinasi, dan kekuatan gerak tubuh.",
        en: "{n} still requires stimulation to improve balance, coordination, and body strength.",
      },
    },
    indikator: [
      { kode: "mk1", teks: { id: "Berjalan zig zag (jalan sesuai tidak ada yang terlewat)", en: "Walk in a zigzag pattern" } },
      { kode: "mk2", teks: { id: "Berjalan jongkok pada titian garis (jalan seimbang)", en: "Squat walking along line (balance)" } },
      { kode: "mk3", teks: { id: "Melempar bola (lempar di atas kepala)", en: "Throw a ball (overhand)" } },
      { kode: "mk4", teks: { id: "Menangkap bola (tertangkap)", en: "Catch a ball successfully" } },
    ],
  },
  {
    id: "quran",
    judul: { id: "Membaca Al-Qur’an", en: "Qur’an Reading" },
    cakupan: {
      id: "Meliputi kemampuan mengenal huruf hijaiyah, membaca huruf hijaiyah dengan metode Utsmani.",
      en: "This includes the ability to recognize hijaiyah letters, read hijaiyah using the Utsmani method according to their level, and basic pronunciation.",
    },
    label: LABEL_QURAN,
    deskripsi: {
      baik: {
        id: "Anak telah mengenal huruf hijaiyah dan/atau mampu membaca sesuai tahapan belajarnya dengan cukup baik.",
        en: "The child has recognized hijaiyah letters and/or is able to read according to their learning stage quite well.",
      },
      perlu: {
        id: "Anak masih dalam tahap awal pengenalan huruf hijaiyah dan memerlukan bimbingan serta pembiasaan membaca secara rutin.",
        en: "The child is still at the initial stage of recognizing hijaiyah letters and requires guidance and regular reading practice.",
      },
    },
    catatan: {
      baik: {
        id: "{n} telah mengenal huruf hijaiyah dan/atau mampu membaca sesuai tahapan belajarnya dengan cukup baik.",
        en: "{n} has recognized hijaiyah letters and/or is able to read according to their learning stage quite well.",
      },
      perlu: {
        id: "{n} masih dalam tahap awal pengenalan huruf hijaiyah dan memerlukan bimbingan serta pembiasaan membaca secara rutin.",
        en: "{n} is still in the early stages of recognizing hijaiyah letters and needs guidance and getting used to reading regularly.",
      },
    },
    indikator: [
      { kode: "qr1", teks: { id: "Mengenal dan menyebutkan huruf hijaiyah tunggal", en: "Recognition and pronunciation of hijaiyah letters" } },
      { kode: "qr2", teks: { id: "Mengenal tanda baca/harokah fathah", en: "Recognition of the fathah vowel mark" } },
      { kode: "qr3", teks: { id: "Kelancaran membaca", en: "Reading fluency" } },
      { kode: "qr4", teks: { id: "Sikap dan adab terhadap Al Qur’an", en: "Attitude and manners toward the Qur’an" } },
    ],
  },
]

export const SD_INDIKATOR_KODE: string[] = SD_ASPEK.flatMap((a) => a.indikator.map((i) => i.kode))
export const SD_JUMLAH_INDIKATOR = SD_INDIKATOR_KODE.length

/** Teks tetap halaman deskripsi dan halaman hasil, per bahasa. `{jumlah}` = jumlah calon siswa yang diobservasi. */
export interface SdTeks {
  deskripsi: {
    judul: [string, string]
    pembuka: [string, string]
    aspekDiobservasi: string
    informasiLanjutan: { judul: string; teks: string } | null
    penutup: { judul: string; paragraf: string[] }
  }
  hasil: {
    /** `{gelombang}` = angka Romawi. */
    judul: [string, string]
    nama: string
    asalSekolah: string
    kolomIndikator: string
    kolomHasil: string
    catatan: string
    mengetahui: string
    kepalaSekolah: string
    ketuaPelaksana: string
  }
}

export const SD_TEKS: Record<Bahasa, SdTeks> = {
  en: {
    deskripsi: {
      judul: ["DESCRIPTION OF OBSERVATION RESULTS OF PROSPECTIVE STUDENTS", "AL FAKHIR ISLAMIC MODERN PRIMARY SCHOOL"],
      pembuka: [
        "Alhamdulillāh, Al Fakhir Islamic Modern Primary School has conducted an observation of {jumlah} prospective students as part of the process of mapping children’s school readiness. This observation aims to assess the child’s overall stage of development — not to compare them with others, but to understand their potential and the appropriate stimulation they may need.",
        "",
      ],
      aspekDiobservasi: "The aspects observed include:",
      informasiLanjutan: {
        judul: "Further information:",
        teks: "The implementation of standardization of the Utsmani method in Qur’anic recitation will be applied at Al Fakhir Islamic Modern Primary School.",
      },
      penutup: {
        judul: "Closing",
        paragraf: [
          "These observation results serve as an initial overview to help the school and parents understand the child’s learning readiness. Every child has unique characteristics and develops at a different pace.",
          "For children categorized as Need Improvement, this does not mean they are left behind. Rather, they need further stimulation and guidance, which Insya Allah will support through our learning programs at Al Fakhir Islamic Modern Primary School.",
          "We believe that through synergy between the school and parents, every child can grow into an outstanding individual with noble character and become a source of pride.",
          "Thank you for the trust that Parents have placed in Al Fakhir Islamic Modern Primary School.",
        ],
      },
    },
    hasil: {
      judul: ["OBSERVATION RESULTS OF PROSPECTIVE STUDENTS BATCH {gelombang}", "AL FAKHIR ISLAMIC MODERN PRIMARY SCHOOL"],
      nama: "Name",
      asalSekolah: "School Name",
      kolomIndikator: "Indicator",
      kolomHasil: "Result",
      catatan: "Note:",
      mengetahui: "Acknowledged by,",
      kepalaSekolah: "Principal",
      ketuaPelaksana: "Event Coordinator",
    },
  },
  id: {
    deskripsi: {
      judul: ["DESKRIPSI HASIL OBSERVASI CALON SISWA", "SD ISLAM MODERN AL FAKHIR"],
      pembuka: [
        "Alhamdulillāh, SD Islam Modern Al Fakhir telah melaksanakan kegiatan observasi terhadap {jumlah} calon siswa sebagai bagian dari proses pemetaan kesiapan belajar anak. Observasi ini bertujuan untuk melihat tahap perkembangan anak secara menyeluruh, bukan untuk membandingkan, melainkan untuk memahami potensi dan kebutuhan stimulasi yang tepat.",
        "",
      ],
      aspekDiobservasi: "Aspek yang diobservasi meliputi:",
      informasiLanjutan: null,
      penutup: {
        judul: "Penutup",
        paragraf: [
          "Hasil observasi ini merupakan gambaran awal untuk membantu sekolah dan orang tua memahami kesiapan belajar anak. Setiap anak memiliki keunikan dan kecepatan perkembangan yang berbeda.",
          "Bagi anak dengan predikat Belum Berkembang, bukan berarti tertinggal, melainkan membutuhkan stimulasi dan pendampingan lebih lanjut yang Insya Allah akan kami dukung melalui program pembelajaran di SD Islam Modern Al Fakhir.",
          "Kami percaya bahwa dengan sinergi antara sekolah dan orang tua, setiap anak dapat tumbuh menjadi pribadi yang unggul, berakhlak mulia, dan membanggakan.",
          "Terima kasih atas kepercayaan Ayah dan Bunda kepada SD Islam Modern Al Fakhir.",
        ],
      },
    },
    hasil: {
      judul: ["LAPORAN HASIL OBSERVASI SISWA GELOMBANG {gelombang}", "SD ISLAM MODERN AL-FAKHIR"],
      nama: "Nama",
      asalSekolah: "Asal Sekolah",
      kolomIndikator: "Indikator",
      kolomHasil: "Hasil",
      catatan: "Catatan :",
      mengetahui: "Mengetahui,",
      kepalaSekolah: "Kepala Sekolah",
      ketuaPelaksana: "Ketua Pelaksana",
    },
  },
}

const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
export const romawi = (n: number) => ROMAWI[n] ?? String(n)

export function formatTanggalEn(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

/** "2026-06-01" -> { id: "1 Juni 2026", en: "June 1, 2026" }. */
export function tanggalDwibahasa(iso: string): Dwibahasa {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return { id: "", en: "" }
  return { id: formatTanggalLong(d), en: formatTanggalEn(d) }
}

export const SD_KEPUTUSAN: Record<SuratStatus, Dwibahasa> = {
  DITERIMA: { id: "diterima", en: "accepted" },
  DIPERTIMBANGKAN: { id: "dipertimbangkan", en: "under consideration" },
  "TIDAK DITERIMA": { id: "tidak diterima", en: "not accepted" },
}

/** Kalimat keputusan di akhir halaman hasil, dengan potongan tebal pada nama dan keputusan. */
export function keputusanSegmen(bahasa: Bahasa, nama: string, status: SuratStatus): RichSegment[] {
  const k = SD_KEPUTUSAN[status][bahasa]
  return bahasa === "id"
    ? [
        { text: "Berdasarkan hasil observasi yang telah dilakukan, bahwa ", bold: false },
        { text: nama, bold: true },
        { text: " dinyatakan ", bold: false },
        { text: k, bold: true },
        { text: " sebagai siswa SD Islam Modern Al Fakhir.", bold: false },
      ]
    : [
        { text: "Based on the results of the observation test, ", bold: false },
        { text: nama, bold: true },
        { text: " is declared ", bold: false },
        { text: k, bold: true },
        { text: " as a student at Al Fakhir Islamic Modern Primary School.", bold: false },
      ]
}

export const namaPanggilan = (nama: string) => nama.trim().split(/\s+/)[0] ?? nama

export function labelNilai(aspek: SdAspek, nilai: SdNilai, bahasa: Bahasa) {
  return aspek.label[nilai][bahasa]
}

export type SdNilaiMap = Partial<Record<string, SdNilai>>

/**
 * Predikat aspek dari nilai indikatornya: "perlu" bila setidaknya separuh indikator perlu pendampingan.
 * null jika masih ada indikator yang belum dinilai.
 */
export function aspekPredikat(aspek: SdAspek, nilai: SdNilaiMap): SdNilai | null {
  const values = aspek.indikator.map((i) => nilai[i.kode])
  if (values.some((v) => v === undefined)) return null
  const perlu = values.filter((v) => v === "perlu").length
  return perlu * 2 >= values.length ? "perlu" : "baik"
}

export const sdLengkap = (nilai: SdNilaiMap) => SD_INDIKATOR_KODE.every((k) => nilai[k] !== undefined)

export function catatanBawaan(aspek: SdAspek, predikat: SdNilai, nama: string, bahasa: Bahasa) {
  return aspek.catatan[predikat][bahasa].replaceAll("{n}", namaPanggilan(nama))
}

/** Isian guru yang disimpan di Candidate.sdRaport (JSON). */
export interface SdRaportSimpan {
  nilai: SdNilaiMap
  /** Catatan Indonesia yang ditulis guru per aspek; kosong/tidak ada = pakai catatan bawaan. */
  catatan: Partial<Record<SdAspekId, string>>
}

export const SD_CATATAN_MAKS = 600

const ASPEK_ID = new Set<string>(SD_ASPEK.map((a) => a.id))
const KODE = new Set(SD_INDIKATOR_KODE)

/** Baca JSON tersimpan secara defensif: kode/nilai yang tidak dikenal dibuang. */
export function parseSdRaport(raw: string | null | undefined): SdRaportSimpan {
  const kosong: SdRaportSimpan = { nilai: {}, catatan: {} }
  if (!raw) return kosong
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return kosong
    const { nilai, catatan } = parsed as { nilai?: unknown; catatan?: unknown }
    const out: SdRaportSimpan = { nilai: {}, catatan: {} }
    if (typeof nilai === "object" && nilai !== null) {
      for (const [k, v] of Object.entries(nilai)) {
        if (KODE.has(k) && (v === "baik" || v === "perlu")) out.nilai[k] = v
      }
    }
    if (typeof catatan === "object" && catatan !== null) {
      for (const [k, v] of Object.entries(catatan)) {
        if (ASPEK_ID.has(k) && typeof v === "string" && v.trim()) out.catatan[k as SdAspekId] = v.trim().slice(0, SD_CATATAN_MAKS)
      }
    }
    return out
  } catch {
    return kosong
  }
}

export function serializeSdRaport(data: SdRaportSimpan): string {
  return JSON.stringify(data)
}

export interface SdAspekHasil {
  id: SdAspekId
  predikat: SdNilai
  indikator: { teks: Dwibahasa; hasil: Dwibahasa }[]
  catatan: Dwibahasa
}

/** Data satu raport SD; dipakai editor dan pembuat PDF. */
export interface RaportSdData {
  nomor: string
  /** yyyy-mm-dd; tanggal di tanda tangan. */
  tanggal: string
  nama: string
  asalSekolah: string
  /** NIM siswa; juga dipakai sebagai kata sandi PDF. */
  nim: string
  gelombang: number
  /** Jumlah calon siswa yang diobservasi (kalimat pembuka). */
  jumlahSiswa: number
  status: SuratStatus
  kepalaSekolah: string
  ketuaPelaksana: string
  aspek: SdAspekHasil[]
}

/** Bangun hasil per aspek dari nilai indikator dan catatan guru. Catatan Inggris selalu dari templat. */
export function bangunAspekHasil(nama: string, simpan: SdRaportSimpan): SdAspekHasil[] | null {
  const hasil: SdAspekHasil[] = []
  for (const aspek of SD_ASPEK) {
    const predikat = aspekPredikat(aspek, simpan.nilai)
    if (!predikat) return null
    hasil.push({
      id: aspek.id,
      predikat,
      indikator: aspek.indikator.map((i) => {
        const n = simpan.nilai[i.kode] ?? predikat
        return { teks: i.teks, hasil: aspek.label[n] }
      }),
      catatan: {
        id: simpan.catatan[aspek.id] ?? catatanBawaan(aspek, predikat, nama, "id"),
        en: catatanBawaan(aspek, predikat, nama, "en"),
      },
    })
  }
  return hasil
}

export const SD_DEFAULT_KEPALA_SEKOLAH = "Arifah Hilyati, S.S., M.Pd."
export const SD_DEFAULT_KETUA_PELAKSANA = "Lulu Luthfiyah, S.Pd."

export interface RaportSdCandidateInput {
  name: string
  level: string
  correctedName?: string | null
  gelombang: number
  nim?: string | null
  originSchool?: string | null
  /** Isian guru (JSON) dari Candidate.sdRaport. */
  sdRaport?: string | null
  /** Keputusan pewawancara dari catatan observasi. */
  note?: { recommendation: string } | null
}

export interface RaportSdDefaults {
  nomor: string
  tanggal: string
  kepalaSekolah: string
  ketuaPelaksana: string
  jumlahSiswa: number
}

export type RaportSdBuildResult =
  | { ok: true; data: RaportSdData }
  | { ok: false; reason: "jenjang" | "keputusan" | "nim" | "indikator" }

const KEPUTUSAN: Record<string, SuratStatus> = {
  Terima: "DITERIMA",
  Pertimbangkan: "DIPERTIMBANGKAN",
  Tolak: "TIDAK DITERIMA",
}

/** Bentuk raport SD dari siswa. Gagal jika bukan SD, belum ada keputusan, NIM kosong, atau indikator belum lengkap. */
export function raportSdDariSiswa(c: RaportSdCandidateInput, defaults: RaportSdDefaults): RaportSdBuildResult {
  if (c.level !== "SD") return { ok: false, reason: "jenjang" }
  const status = c.note?.recommendation ? KEPUTUSAN[c.note.recommendation] : undefined
  if (!status) return { ok: false, reason: "keputusan" }
  const nim = c.nim?.trim()
  if (!nim) return { ok: false, reason: "nim" }

  const nama = c.correctedName || c.name
  const aspek = bangunAspekHasil(nama, parseSdRaport(c.sdRaport))
  if (!aspek) return { ok: false, reason: "indikator" }

  return {
    ok: true,
    data: {
      nomor: defaults.nomor,
      tanggal: defaults.tanggal,
      nama,
      asalSekolah: c.originSchool?.trim() ?? "",
      nim,
      gelombang: c.gelombang,
      jumlahSiswa: defaults.jumlahSiswa,
      status,
      kepalaSekolah: defaults.kepalaSekolah,
      ketuaPelaksana: defaults.ketuaPelaksana,
      aspek,
    },
  }
}
