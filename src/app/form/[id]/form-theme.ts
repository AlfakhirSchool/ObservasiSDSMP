import {
  Baby,
  BookHeart,
  BookOpen,
  ClipboardList,
  Clock,
  Handshake,
  HeartPulse,
  House,
  Lightbulb,
  ShieldCheck,
  Smile,
  Sprout,
  User,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * Kelas Tailwind ditulis utuh (bukan disusun) agar terbaca oleh pemindai kelas Tailwind. Warna memakai heksa
 * eksplisit: token `sd-light` dan `ring-sd` tidak ada di tema, dan globals.css memaksa bingkai fokus hijau
 * sehingga `focus:!border-*` diperlukan untuk menimpanya.
 */
export const ACCENT = {
  SD: {
    hero: "bg-gradient-to-br from-orange-400 via-[#E67E22] to-orange-600",
    page: "bg-gradient-to-b from-orange-50 via-[#FBF7F2] to-slate-50",
    bar: "bg-[#E67E22]",
    solid: "bg-[#E67E22] hover:bg-orange-600",
    text: "text-[#E67E22]",
    border: "border-[#E67E22]",
    soft: "bg-[#FFF3E0]",
    ring: "focus-visible:ring-[#E67E22]/40 focus:!border-[#E67E22] focus:ring-[#E67E22]/25",
    cardActive: "ring-[#E67E22]/35",
    glow: "shadow-orange-500/25",
  },
  SMP: {
    hero: "bg-gradient-to-br from-teal-500 via-[#0D5C63] to-teal-900",
    page: "bg-gradient-to-b from-teal-50 via-[#F3F8F8] to-slate-50",
    bar: "bg-[#0D5C63]",
    solid: "bg-[#0D5C63] hover:bg-[#0A454A]",
    text: "text-[#0D5C63]",
    border: "border-[#0D5C63]",
    soft: "bg-[#E0F2F1]",
    ring: "focus-visible:ring-[#0D5C63]/40 focus:!border-[#0D5C63] focus:ring-[#0D5C63]/25",
    cardActive: "ring-[#0D5C63]/35",
    glow: "shadow-teal-700/25",
  },
} as const

export type Accent = (typeof ACCENT)[keyof typeof ACCENT]

/** Pola bintang segi delapan (motif logo sekolah) untuk latar kepala formulir. */
const STAR = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><g fill='none' stroke='white' stroke-opacity='.16' stroke-width='1.2'><rect x='12' y='12' width='32' height='32'/><rect x='12' y='12' width='32' height='32' transform='rotate(45 28 28)'/></g></svg>"
)
export const STAR_PATTERN = `url("data:image/svg+xml,${STAR}")`

export const SECTION_ICON: Record<string, LucideIcon> = {
  "Konfirmasi Data": ShieldCheck,
  "Identitas Anak": Baby,
  "Data Ayah": User,
  "Data Ibu": UserRound,
  "Keluarga di Rumah": House,
  "Riwayat Kelahiran dan Tumbuh Kembang": Sprout,
  "Kemandirian dan Sifat Ananda": Smile,
  "Kesehatan dan Riwayat Medis": HeartPulse,
  "Kebiasaan dan Kemandirian": Clock,
  "Sosial dan Emosional": Users,
  "Gaya Belajar dan Kemampuan Kognitif": Lightbulb,
  "Pembiasaan Keagamaan": BookHeart,
  "Harapan dan Komitmen Orang Tua": Handshake,
}

/** Ikon bagian yang judulnya tidak terdaftar: bagian soal umum (dipecah per 8) atau bagian lain. */
export const GENERIC_STEP_ICON = BookOpen
export const FALLBACK_STEP_ICON = ClipboardList

/** Kalimat pengantar singkat di bawah judul bagian (bagian yang tidak terdaftar tanpa pengantar). */
const SECTION_INTRO: Record<string, string> = {
  "Konfirmasi Data": "Pastikan nama Ananda tertulis benar dan kami punya nomor yang bisa dihubungi.",
  "Identitas Anak": "Data dasar Ananda yang akan kami pakai untuk administrasi.",
  "Data Ayah": "Data Ayah sebagai orang tua atau wali.",
  "Data Ibu": "Data Ibu sebagai orang tua atau wali.",
  "Keluarga di Rumah": "Gambaran kedekatan Ananda di lingkungan keluarga.",
  "Riwayat Kelahiran dan Tumbuh Kembang": "Isi sesuai ingatan Bapak/Ibu. Perkiraan juga tidak apa-apa.",
  "Kemandirian dan Sifat Ananda": "Pilih yang paling menggambarkan Ananda sehari-hari.",
  "Kesehatan dan Riwayat Medis": "Informasi ini membantu kami menyiapkan pendampingan yang tepat.",
  "Kebiasaan dan Kemandirian": "Rutinitas dan kebiasaan Ananda di rumah.",
  "Sosial dan Emosional": "Bagaimana Ananda bergaul dan mengelola perasaannya.",
  "Gaya Belajar dan Kemampuan Kognitif": "Cara belajar dan kemampuan dasar Ananda.",
  "Pembiasaan Keagamaan": "Pembiasaan ibadah dan kedekatan Ananda dengan Al-Qur'an.",
  "Harapan dan Komitmen Orang Tua": "Bagian terakhir: harapan dan kerja sama Bapak/Ibu dengan sekolah.",
}

export const sectionIntro = (title: string): string | null => SECTION_INTRO[title] ?? null
