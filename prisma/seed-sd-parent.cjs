// Ganti SELURUH soal orang tua jenjang SD dengan daftar "Data Diri Anak Peserta Tes Kesiapan Sekolah".
// Pemakaian: node prisma/seed-sd-parent.cjs --ya
//
// PERINGATAN: soal lama dihapus, dan jawaban orang tua SD yang terkait IKUT TERHAPUS (relasi cascade).
// Skrip menolak berjalan tanpa --ya. Cadangkan dulu bila jawaban lama masih diperlukan.
// Id soal bersifat tetap (sd-ortu-<kunci>) sehingga skrip aman dijalankan ulang.
const { PrismaClient } = require("@prisma/client")

const LEVEL = "SD"
const CATEGORY = "ORANG TUA"
const YA_TIDAK = ["Ya", "Tidak"]
const SUDAH_BELUM = ["Sudah", "Belum"]
const PENDIDIKAN = ["SD", "SMP", "SMA/SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3", "Yang lain:"]

/** Pembantu: [kunci, teks, opsi]. `t` teks pendek, `n` angka, `l` teks panjang, `c` pilihan. */
const q = (type, key, text, extra = {}) => ({ type, key, text, ...extra })
const t = (key, text, extra) => q("text", key, text, extra)
const n = (key, text, extra) => q("number", key, text, extra)
const l = (key, text, extra) => q("long_text", key, text, extra)
const c = (key, text, options, extra) => q("choice", key, text, { options, ...extra })

const orangTua = (who, pre) => [
  t(`${pre}-nama`, `Nama ${who}`),
  n(`${pre}-usia`, `Usia ${who}`, { hint: "Dalam tahun" }),
  t(`${pre}-suku`, `Suku Bangsa ${who}`),
  t(`${pre}-agama`, `Agama ${who}`),
  t(`${pre}-kedudukan`, `Kedudukan ${who} di Keluarga`, { hint: "cth : 1 dari 2 bersaudara" }),
  t(`${pre}-kawin`, `Perkawinan ke ___ (${who})`, { hint: "Tulis angkanya saja, mis. 1" }),
  n(`${pre}-usia-kawin`, `Usia ${who} pada Perkawinan ke-1`, { hint: "Dalam tahun" }),
  c(`${pre}-pendidikan`, `Pendidikan Terakhir ${who}`, PENDIDIKAN),
  t(`${pre}-kerja`, `Pekerjaan ${who}`),
  l(`${pre}-alamat`, `Alamat ${who}`),
  t(`${pre}-wa`, `Nomor Whatsapp Aktif ${who}`, { hint: "Contoh: 0812XXXXXXXX", inputKind: "tel" }),
]

const SIFAT = [
  ["malu", "pemalu"], ["diam", "pendiam"], ["takut", "penakut"], ["marah", "pemarah"], ["keras", "keras kepala"],
  ["berani", "pemberani"], ["aktif", "aktif"], ["bangkang", "pembangkang"], ["sedih", "penyedih"],
  ["gaul", "mudah bergaul"], ["kritis", "kritis"], ["tuntut", "penuntut"], ["malas", "pemalas"],
]

const SECTIONS = [
  {
    title: "Identitas Anak",
    items: [
      c("jk", "Jenis Kelamin Ananda", ["Laki - Laki", "Perempuan"]),
      t("ttl", "Tempat dan Tanggal Lahir Ananda", { hint: "cth : Depok, 12 Maret 2020" }),
      t("usia", "Usia Ananda", { hint: "cth : 5 tahun 6 bulan" }),
      t("pendidikan", "Pendidikan Ananda saat ini", { hint: "cth : TK B" }),
      t("sekolah", "Nama Sekolah"),
      c("kegiatan", "Apakah Ananda mengikuti kegiatan selain sekolah?", YA_TIDAK),
      t("kegiatan-nama", "Nama kegiatan Ananda", { required: false, showIf: ["kegiatan", "Ya"] }),
      l("prestasi", "Prestasi yang pernah diraih Ananda"),
      t("suku", "Suku Bangsa Ananda"),
      t("agama", "Agama Ananda"),
      t("kedudukan", "Kedudukan Ananda di Keluarga", { hint: "cth : 1 dari 2 bersaudara" }),
      l("alamat", "Alamat Ananda"),
    ],
  },
  { title: "Data Ayah", items: orangTua("Ayah", "ayah") },
  { title: "Data Ibu", items: orangTua("Ibu", "ibu") },
  {
    title: "Keluarga di Rumah",
    items: [
      t("akrab", "Dengan siapa Ananda paling akrab di rumah?", { hint: "cth : ayah, ibu, kakak, adik, anggota keluarga lainnya" }),
      t("figur", "Siapakah figur yang dihormati atau disegani Ananda?"),
    ],
  },
  {
    title: "Riwayat Kelahiran dan Tumbuh Kembang",
    items: [
      c("hamil", "Apakah selama kehamilan mengalami masalah?", YA_TIDAK),
      n("lahir-minggu", "Usia kandungan pada saat kelahiran (minggu)"),
      n("lahir-berat", "Berat Ananda ketika lahir (kg)", { hint: "Boleh pakai koma, mis. 3,2" }),
      n("lahir-panjang", "Panjang Ananda ketika lahir (cm)"),
      n("asi", "Minum ASI sampai usia (bulan)"),
      n("tengkurap", "Usia Ananda tengkurap (bulan)"),
      n("duduk", "Usia Ananda duduk (bulan)"),
      n("jalan", "Usia Ananda jalan (bulan)"),
      n("bicara", "Usia Ananda mulai dapat bicara (tahun)"),
      n("lancar-bicara", "Usia Ananda lancar berbicara (tahun)"),
      n("warna", "Usia Ananda mulai mengenal warna (tahun)"),
      n("angka", "Usia Ananda mulai mengenal angka (tahun)"),
      n("huruf", "Usia Ananda mulai mengenal huruf (tahun)"),
      n("tulis", "Usia Ananda mulai menulis huruf (tahun)"),
      n("hitung", "Ananda sudah bisa berhitung sampai"),
    ],
  },
  {
    title: "Kemandirian dan Sifat Ananda",
    items: [
      c("mandi", "Ananda mandi sendiri", SUDAH_BELUM),
      c("bak", "Ananda buang air kecil sendiri", SUDAH_BELUM),
      c("bab", "Ananda buang air besar sendiri", SUDAH_BELUM),
      c("makan", "Ananda makan sendiri", SUDAH_BELUM),
      c("pakaian", "Ananda berpakaian sendiri", SUDAH_BELUM),
      ...SIFAT.map(([key, label]) => c(`sifat-${key}`, `Ananda ${label}`, YA_TIDAK)),
    ],
  },
  {
    title: "Kesehatan dan Riwayat Medis",
    items: [
      c("lihat", "Penglihatan Ananda", ["Baik", "Bermasalah"]),
      c("dengar", "Pendengaran Ananda", ["Baik", "Bermasalah"]),
      c("sakit", "Frekuensi Ananda sakit", ["Jarang", "Sering"]),
      c("kidal", "Ananda kidal", YA_TIDAK),
      c("cadel", "Ananda berbicara dengan cadel", YA_TIDAK),
      c("jatuh", "Ananda pernah jatuh", YA_TIDAK),
      c("kejang", "Ananda pernah kejang", YA_TIDAK),
      t("kejang-usia", "Jika pernah kejang, di usia berapa?", { required: false, showIf: ["kejang", "Ya"] }),
      c("rs", "Ananda pernah dirawat di rumah sakit", YA_TIDAK),
      t("rs-usia", "Jika pernah, di usia berapa?", { required: false, showIf: ["rs", "Ya"] }),
      t("rs-sakit", "Jika pernah, sakit apa yang diderita?", { required: false, showIf: ["rs", "Ya"] }),
      c("psikologis", "Apakah Ananda pernah menjalani pemeriksaan psikologis?", ["Pernah", "Belum pernah"]),
      c("diagnosa", "Apakah Ananda pernah mendapatkan diagnosa?", ["Pernah", "Belum pernah"]),
      l("diagnosa-isi", "Jika pernah, tuliskan diagnosa yang pernah diberikan", { required: false, showIf: ["diagnosa", "Pernah"] }),
      c("terapi", "Apakah Ananda pernah menjalani terapi tumbuh kembang?", ["Pernah", "Belum pernah"]),
      l("keluhan-ortu", "Keluhan orang tua terhadap Ananda di rumah"),
      l("keluhan-guru", "Keluhan guru terhadap Ananda di sekolah"),
    ],
  },
  {
    title: "Kebiasaan dan Kemandirian",
    items: [
      c("gawai", "Apakah Ananda diizinkan bermain gawai?", YA_TIDAK),
      l("gawai-detail", "Jika iya, berapa lama durasinya dan aplikasi apa yang biasa digunakan?", { required: false, showIf: ["gawai", "Ya"] }),
      t("tidur", "Pukul berapa Ananda biasa tidur dan bangun tidur?"),
      l("hobi", "Apa hobi Ananda (seni, olahraga, bahasa, atau akademik)? Sebutkan."),
      l("kerja-rumah", "Pekerjaan rumah apa yang sudah mulai dilatihkan kepada Ananda?"),
      l("makan-minum", "Apakah Ananda sudah mandiri dalam makan dan minum?"),
      l("toilet", "Apakah Ananda sudah terbiasa ke toilet sendiri?"),
    ],
  },
  {
    title: "Sosial dan Emosional",
    items: [
      l("teman-usia", "Bagaimana sikap Ananda saat berinteraksi dengan teman yang lebih tua atau lebih muda?"),
      l("adaptasi", "Apakah Ananda mudah beradaptasi dengan lingkungan baru? Jelaskan."),
      l("beda-pendapat", "Bagaimana respons Ananda ketika terjadi perbedaan pendapat dengan teman?"),
      l("guru", "Bagaimana sikap Ananda terhadap guru atau orang dewasa di sekolah?"),
      l("teman-dekat", "Apakah Ananda memiliki teman dekat atau kelompok bermain?"),
      l("emosi", "Bagaimana cara Ananda mengekspresikan emosi saat marah atau kecewa?"),
      l("tenang", "Apa yang biasanya dilakukan orang tua untuk menenangkan Ananda?"),
    ],
  },
  {
    title: "Gaya Belajar dan Kemampuan Kognitif",
    items: [
      l("belajar", "Bagaimana kebiasaan belajar Ananda di rumah?"),
      l("gaya", "Ananda lebih menyukai belajar dengan cara apa?", {
        hint: "cth : sambil mendengarkan (auditori/musikal), melihat (visual), atau bergerak/berjalan/menulis (kinestetik)",
      }),
      l("baca", "Apakah Ananda memiliki minat membaca? Jenis bacaan apa yang disukai?"),
      l("bakat", "Bakat atau potensi apa yang mulai terlihat pada diri Ananda?"),
      l("konsentrasi", "Bagaimana kemampuan Ananda berkonsentrasi saat belajar atau mendengarkan cerita?"),
      l("instruksi", "Apakah Ananda mampu mengikuti instruksi sederhana hingga selesai?"),
      l("kesulitan", "Bagaimana respons Ananda ketika mengalami kesulitan belajar?"),
      l("dasar", "Berdasarkan pengamatan Bapak/Ibu, bagaimana kemampuan dasar Ananda (mengenal huruf, angka, dan warna)?"),
    ],
  },
  {
    title: "Pembiasaan Keagamaan",
    items: [
      l("salat", "Apakah Ananda sudah diajarkan dan dibiasakan salat lima waktu?"),
      c("quran", "Apakah Ananda sudah lancar membaca Al-Qur'an?", SUDAH_BELUM),
      t("quran-metode", "Jika belum, metode apa yang digunakan di rumah?", {
        required: false,
        showIf: ["quran", "Belum"],
        hint: "Iqro' / Utsmani / Tilawati / Ummi / Yanbu'a / lainnya",
      }),
      c("hafalan", "Apakah Ananda sudah memiliki hafalan Al-Qur'an?", SUDAH_BELUM),
      t("hafalan-jumlah", "Jika sudah, berapa surah/juz?", { showIf: ["hafalan", "Sudah"] }),
    ],
  },
  {
    title: "Harapan dan Komitmen Orang Tua",
    items: [
      l("alasan", "Apa alasan Bapak/Ibu memilih SD Islam Modern Al Fakhir sebagai sekolah Ananda?"),
      c("hadir", "Apakah Bapak/Ibu bersedia hadir dalam kegiatan sekolah yang melibatkan orang tua dan mendukung program sekolah?", YA_TIDAK),
      l("harapan", "Apa harapan Bapak/Ibu menyekolahkan Ananda di SD Islam Modern Al Fakhir?"),
      l("sanggup", "Bagaimana kesanggupan Bapak/Ibu dalam menyekolahkan Ananda di SD Islam Modern Al Fakhir?"),
      c("kerja-sama", "Apakah Bapak/Ibu bersedia bekerja sama dengan sekolah terkait perkembangan Ananda?", YA_TIDAK),
    ],
  },
]

const idOf = (key) => `sd-ortu-${key}`

function build() {
  const rows = []
  const keys = new Set()
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (keys.has(item.key)) throw new Error(`Kunci ganda: ${item.key}`)
      keys.add(item.key)
      rows.push({ section: section.title, item })
    }
  }
  return rows.map(({ section, item }, i) => {
    if (item.showIf && !keys.has(item.showIf[0])) throw new Error(`showIf tidak dikenal: ${item.showIf[0]}`)
    return {
      id: idOf(item.key),
      text: item.text,
      type: item.type,
      category: CATEGORY,
      level: LEVEL,
      order: i + 1,
      options: item.options ? JSON.stringify(item.options) : null,
      isSystem: false,
      section,
      required: item.required ?? true,
      hint: item.hint ?? null,
      showIfId: item.showIf ? idOf(item.showIf[0]) : null,
      showIfValue: item.showIf ? item.showIf[1] : null,
    }
  })
}

async function main() {
  const data = build()
  if (!process.argv.includes("--ya")) {
    console.log(`Akan MENGHAPUS soal SD (${CATEGORY}) lama beserta jawabannya, lalu membuat ${data.length} soal baru.`)
    console.log("Jalankan lagi dengan --ya untuk melanjutkan.")
    process.exit(1)
  }
  const prisma = new PrismaClient()
  try {
    const [hapusJawaban, hapusSoal, buat] = await prisma.$transaction([
      prisma.formAnswer.deleteMany({ where: { question: { level: LEVEL, category: CATEGORY } } }),
      prisma.formQuestion.deleteMany({ where: { level: LEVEL, category: CATEGORY } }),
      prisma.formQuestion.createMany({ data }),
    ])
    console.log(`Jawaban lama dihapus: ${hapusJawaban.count} | soal lama dihapus: ${hapusSoal.count} | soal baru: ${buat.count}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("GAGAL:", e.message)
  process.exit(1)
})
