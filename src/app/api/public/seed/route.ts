import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const questions = [
  // --- WAWANCARA ORANG TUA (SMP) ---
  { text: "Ananda anak ke berapa dari berapa bersaudara?", type: "text", category: "Keluarga", order: 1 },
  { text: "Dengan siapa ananda akrab di rumah?", type: "text", category: "Keluarga", order: 2 },
  { text: "Siapakah figure yang dihormati/ditakuti Ananda?", type: "text", category: "Keluarga", order: 3 },
  { text: "Apakah Ananda diizinkan bermain gadget? Jika iya, berapa lama ananda bermain gadget, dan aplikasi apa yang biasa ananda lihat?", type: "long_text", category: "Keluarga", order: 4 },
  { text: "Pada jam berapa Ananda biasa tidur dan bangun tidur?", type: "text", category: "Keluarga", order: 5 },
  { text: "Apakah hobi Ananda, Sebutkan! (bidang seni, olahraga, Bahasa, akademik)?", type: "long_text", category: "Keluarga", order: 6 },
  { text: "Apakah Ananda melaksanakan sholat 5 waktu? Jika iya, apakah ananda sholat tanpa perlu diingatkan?", type: "long_text", category: "Keluarga", order: 7 },
  { text: "Apakah ananda mengerjakan ibadah sunnah lainnya seperti, sholat sunnah dan puasa sunnah?", type: "long_text", category: "Keluarga", order: 8 },
  { text: "Apakah Ananda sudah lancar membaca Al-Qur’an? Jika belum Al-Qur’an, metode apa yang biasa digunakan di rumah (Iqro/Utsmani/Tilawati/Ummi/Yanbu’a)?", type: "long_text", category: "Keluarga", order: 9 },
  { text: "Apakah ananda sudah memiliki hafalan Al-Qur’an? Jika sudah berapa surat/juz?", type: "text", category: "Keluarga", order: 10 },
  { text: "Mata pelajaran apakah yang paling disukai Ananda?", type: "text", category: "Akademik", order: 11 },
  { text: "Mata pelajaran apa yang sering menjadi kendala?", type: "text", category: "Akademik", order: 12 },
  { text: "Apakah orang tua terbiasa mendampingi evaluasi hasil belajar anak?", type: "long_text", category: "Akademik", order: 13 },
  { text: "Apakah Ananda memiliki prestasi di bidang akademik maupun non akademik? Jika ada sebutkan!", type: "long_text", category: "Akademik", order: 14 },
  { text: "Menurut Bapak/Ibu, bagaimana kesiapan anak menghadapi tuntutan belajar yang lebih mandiri di SMP?", type: "long_text", category: "Kemandirian", order: 15 },
  { text: "Jika anak menghadapi tugas sekolah yang sulit atau menumpuk, biasanya sikap anak adalah?", type: "long_text", category: "Kemandirian", order: 16 },
  { text: "Sejauh mana anak terbiasa bertanggung jawab terhadap kewajibannya (tugas, jadwal, aturan)?", type: "long_text", category: "Kemandirian", order: 17 },
  { text: "Bagaimana sikap anak ketika ditegur atau diberi konsekuensi atas kesalahan yang dilakukan?", type: "long_text", category: "Kemandirian", order: 18 },
  { text: "Jika anak melanggar aturan sekolah, sikap orang tua adalah?", type: "long_text", category: "Kemandirian", order: 19 },
  { text: "Apakah anak terbiasa mengikuti aturan rumah secara konsisten? Jelaskan!", type: "long_text", category: "Kemandirian", order: 20 },
  { text: "Bagaimana sikap ananda saat berinteraksi dengan teman yang lebih tua atau lebih muda?", type: "long_text", category: "Sosial-Emosi", order: 21 },
  { text: "Apakah ananda mudah beradaptasi dengan lingkungan baru? Jelaskan!", type: "long_text", category: "Sosial-Emosi", order: 22 },
  { text: "Bagaimana respon Ananda Ketika terjadi perbedaan pendapat dengan teman?", type: "long_text", category: "Sosial-Emosi", order: 23 },
  { text: "Bagaimana sikap Ananda terhadap guru atau orang dewasa di sekolah?", type: "long_text", category: "Sosial-Emosi", order: 24 },
  { text: "Apakah Ananda memiliki teman dekat atau kelompok bermain?", type: "long_text", category: "Sosial-Emosi", order: 25 },
  { text: "Bagaimana cara ananda mengekspresikan emosi saat marah atau kecewa?", type: "long_text", category: "Sosial-Emosi", order: 26 },
  { text: "Nilai karakter apa yang masih perlu dikuatkan pada anak menurut orang tua?", type: "long_text", category: "Sosial-Emosi", order: 27 },
  { text: "Apa alasan Bapak/Ibu memilih SMP Islam Modern Al Fakhir sebagai sekolah Ananda?", type: "long_text", category: "Sekolah", order: 28 },
  { text: "Apakah Bapak/Ibu berkenan hadir saat acara sekolah yang melibatkan orang tua dan mendukung program sekolah?", type: "choice", category: "Sekolah", options: ["Ya", "Tidak"], order: 29 },
  { text: "Apa harapan Bapak/Ibu menyekolahkan Ananda di SMP Islam Modern Al Fakhir?", type: "long_text", category: "Sekolah", order: 30 },
  { text: "Bagaimana kesanggupan Bapak/Ibu menyekolahkan ananda di Al Fakhir?", type: "choice", category: "Sekolah", options: ["Sanggup dan Komitmen", "Sanggup", "Tidak Sanggup"], order: 31 },
  { text: "Apakah Bapak/Ibu bersedia bekerja sama dengan sekolah terkait perkembangan Ananda?", type: "long_text", category: "Sekolah", order: 32 },
  { text: "Hal apa yang masih menjadi catatan bapak/ibu dalam perkembangan Ananda pada anak seusianya yang dirasa masih belum tumbuh atau masih perlu distimulasi?", type: "long_text", category: "Catatan", order: 33 },
  { text: "Apakah terdapat catatan atau perhatian khusus terkait perkembangan ananda yang perlu diketahui pihak sekolah? Jika ada mohon (dijelaskan)?", type: "long_text", category: "Catatan", order: 34 },
  { text: "Jika ada, apa bentuk pendampingan yang sudah atau sedang dilakukan di rumah?", type: "long_text", category: "Catatan", order: 35 },
  { text: "Apakah ananda memiliki riwayat penyakit?", type: "long_text", category: "Catatan", order: 36 },

  // --- WAWANCARA CALON SISWA (SMP) ---
  { text: "Apa cita-cita Ananda?", type: "text", category: "Siswa-Motivasi", order: 101 },
  { text: "Mengapa Ananda ingin bersekolah di Al Fakhir?", type: "long_text", category: "Siswa-Motivasi", order: 102 },
  { text: "Seberapa yakin Ananda memilih sekolah ini?", type: "choice", category: "Siswa-Motivasi", options: ["100%", "75%", "50%"], order: 103 },
  { text: "Apakah Ananda terbiasa bangun pagi sendiri?", type: "choice", category: "Siswa-Karakter", options: ["Ya", "Tidak"], order: 104 },
  { text: "Apakah Ananda merapikan tempat tidur sendiri?", type: "choice", category: "Siswa-Karakter", options: ["Ya", "Tidak"], order: 105 },
  { text: "Apakah Ananda sudah bisa mencuci piring/baju sendiri?", type: "choice", category: "Siswa-Karakter", options: ["Ya", "Tidak"], order: 106 },
  { text: "Apakah Ananda senang membaca buku?", type: "choice", category: "Siswa-Karakter", options: ["Sangat senang", "Biasa saja", "Tidak suka"], order: 107 },
  { text: "Hobi atau bakat apa yang Ananda miliki?", type: "long_text", category: "Siswa-Bakat", order: 108 },
  { text: "Ekstrakurikuler apa yang ingin diikuti di sekolah nanti?", type: "long_text", category: "Siswa-Bakat", order: 109 },
  { text: "Bagaimana cara Ananda mencari teman baru?", type: "long_text", category: "Siswa-Sosial", order: 110 },
  { text: "Apa yang Ananda lakukan jika berbeda pendapat dengan teman?", type: "long_text", category: "Siswa-Sosial", order: 111 },
  { text: "Bagaimana perasaan Ananda jika harus tinggal jauh dari orang tua (jika boarding)?", type: "long_text", category: "Siswa-Sosial", order: 112 },
  { text: "Sebutkan satu kelebihan yang Ananda banggakan!", type: "text", category: "Siswa-Akademik", order: 113 },
  { text: "Sebutkan satu kekurangan yang ingin Ananda perbaiki!", type: "text", category: "Siswa-Akademik", order: 114 },
]

export async function GET() {
  try {
    console.log("Seeding questions via API...")
    
    // Clear existing SMP questions to avoid duplicates if run multiple times
    await prisma.formQuestion.deleteMany({ 
      where: { 
        level: "SMP",
        // @ts-ignore
        isSystem: false 
      } 
    })

    for (const q of questions) {
      await prisma.formQuestion.create({
        data: {
          text: q.text,
          type: q.type,
          category: q.category,
          order: q.order,
          options: q.options ? JSON.stringify(q.options) : null,
          level: "SMP"
        }
      })
    }
    
    return NextResponse.json({ success: true, count: questions.length })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
