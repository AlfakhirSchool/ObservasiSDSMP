import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const academicQuestions = [
  // Bahasa Indonesia
  {
    subject: "Bahasa Indonesia",
    text: "Setiap hari Minggu pagi, keluarga Budi membersihkan rumah bersama-sama. Ayah menyapu halaman, ibu merapikan ruang tamu, dan Budi membantu mengepel lantai. Pekerjaan rumah pun terasa lebih ringan. Makna kebersamaan dalam cerita tersebut adalah...",
    options: JSON.stringify(["Pekerjaan menjadi lebih berat", "Pekerjaan menjadi lebih ringan", "Budi tidak membantu", "Ayah bekerja sendiri"]),
    correctAnswer: "Pekerjaan menjadi lebih ringan",
    order: 1
  },
  {
    subject: "Bahasa Indonesia",
    text: "Kata rumah, sekolah, pasar termasuk kelompok...",
    options: JSON.stringify(["Kata kerja", "Kata benda", "Kata sifat", "Kata keterangan"]),
    correctAnswer: "Kata benda",
    order: 2
  },
  {
    subject: "Bahasa Indonesia",
    text: "Kalimat yang ditulis dengan huruf kapital yang benar adalah...",
    options: JSON.stringify(["saya tinggal di depok", "Saya Tinggal Di Depok", "Saya tinggal di Depok", "saya Tinggal di depok"]),
    correctAnswer: "Saya tinggal di Depok",
    order: 3
  },
  {
    subject: "Bahasa Indonesia",
    text: "Sinonim kata rajin adalah....",
    options: JSON.stringify(["Malas", "Tekun", "Lambat", "Santai"]),
    correctAnswer: "Tekun",
    order: 4
  },
  {
    subject: "Bahasa Indonesia",
    text: "Perbaikan kalimat berikut yang benar adalah: “adik pergi ke sekolah pagi”",
    options: JSON.stringify(["adik pergi Ke Sekolah pagi", "Adik pergi ke sekolah pagi.", "Adik Pergi Ke Sekolah Pagi", "adik pergi ke sekolah pagi?"]),
    correctAnswer: "Adik pergi ke sekolah pagi.",
    order: 5
  },

  // Matematika
  {
    subject: "Matematika",
    text: "Hasil dari 135 + 25 - 75 = ...",
    options: JSON.stringify(["75", "85", "95", "105"]),
    correctAnswer: "85",
    order: 6
  },
  {
    subject: "Matematika",
    text: "Toko Buku Pelangi sangat ramai dikunjungi pembeli. Toko tersebut memiliki persediaan 1.500 buku cerita. Hari ini terjual 125 buku dan datang kiriman 41 buku baru. Berapa jumlah buku cerita di toko sekarang?",
    options: JSON.stringify(["1.375", "1.416", "1.541", "1.666"]),
    correctAnswer: "1.416",
    order: 7
  },
  {
    subject: "Matematika",
    text: "Faktor persekutuan terbesar (FPB) dari 12 dan 16 adalah...",
    options: JSON.stringify(["2", "4", "6", "8"]),
    correctAnswer: "4",
    order: 8
  },
  {
    subject: "Matematika",
    text: "Perhatikan data kategori mata pelajaran! Jika Modus data adalah IPA, mana yang paling sering muncul?",
    options: JSON.stringify(["Matematika", "Bahasa Indonesia", "IPA", "IPS"]),
    correctAnswer: "IPA",
    order: 9
  },
  {
    subject: "Matematika",
    text: "Pak Budi memiliki sebidang sawah dengan panjang 35 m dan lebar 22 m. Luas dan keliling sawah tersebut adalah...",
    options: JSON.stringify(["770 m2 dan 114 m", "770 m2 dan 57 m", "57 m2 dan 114 m", "114 m2 dan 770 m"]),
    correctAnswer: "770 m2 dan 114 m",
    order: 10
  },

  // Bahasa Inggris
  {
    subject: "Bahasa Inggris",
    text: "My name ___ Ahmad.",
    options: JSON.stringify(["am", "is", "are", "was"]),
    correctAnswer: "is",
    order: 11
  },
  {
    subject: "Bahasa Inggris",
    text: "She ___ to school every day.",
    options: JSON.stringify(["go", "goes", "going", "went"]),
    correctAnswer: "goes",
    order: 12
  },
  {
    subject: "Bahasa Inggris",
    text: "What color is the sky?",
    options: JSON.stringify(["Green", "Red", "Blue", "Yellow"]),
    correctAnswer: "Blue",
    order: 13
  },
  {
    subject: "Bahasa Inggris",
    text: "I have two ___.",
    options: JSON.stringify(["book", "books", "a book", "reading"]),
    correctAnswer: "books",
    order: 14
  },
  {
    subject: "Bahasa Inggris",
    text: "We eat ___ in the morning.",
    options: JSON.stringify(["lunch", "dinner", "breakfast", "snack"]),
    correctAnswer: "breakfast",
    order: 15
  },

  // Agama Islam
  {
    subject: "Agama Islam",
    text: "Pada hari kiamat, setiap manusia akan menerima balasan atas perbuatannya. Hari pembalasan tersebut dikenal dengan istilah...",
    options: JSON.stringify(["Yaumul Ba'ats", "Yaumul Hisab / Jaza", "Yaumul Mahsyar", "Yaumul Mizan"]),
    correctAnswer: "Yaumul Hisab / Jaza",
    order: 16
  },
  {
    subject: "Agama Islam",
    text: "Surat yang diturunkan di kota Mekkah tergolong surat...",
    options: JSON.stringify(["Madaniyah", "Makiyah", "Mubarakah", "Qudsiyah"]),
    correctAnswer: "Makiyah",
    order: 17
  },
  {
    subject: "Agama Islam",
    text: "Nabi Muhammad SAW adalah putra dari...",
    options: JSON.stringify(["Abu Thalib", "Abdul Muthalib", "Abdullah bin Abdul Muthalib", "Hamzah"]),
    correctAnswer: "Abdullah bin Abdul Muthalib",
    order: 18
  },
  {
    subject: "Agama Islam",
    text: "Lafadz yang mengandung hukum tajwid Qalqalah Kubro biasanya berada di...",
    options: JSON.stringify(["Awal kata", "Tengah kata", "Akhir ayat (berhenti)", "Setelah mad"]),
    correctAnswer: "Akhir ayat (berhenti)",
    order: 19
  },
  {
    subject: "Agama Islam",
    text: "Berikut ini yang termasuk 5 Rukun Islam adalah...",
    options: JSON.stringify(["Syahadat, Shalat, Zakat, Puasa, Haji", "Iman kepada Allah, Malaikat, Kitab, Rasul, Hari Akhir", "Sabar, Syukur, Tawakal, Ikhlas, Ridha", "Membaca Quran, Sedekah, Menolong, Berbakti, Jujur"]),
    correctAnswer: "Syahadat, Shalat, Zakat, Puasa, Haji",
    order: 20
  },

  // IPA
  {
    subject: "IPA",
    text: "Makhluk hidup memiliki ciri-ciri tertentu. Berikut yang termasuk ciri makhluk hidup adalah...",
    options: JSON.stringify(["Dapat bergerak dan bernapas", "Terbuat dari plastik", "Tidak membutuhkan makan", "Tetap diam selamanya"]),
    correctAnswer: "Dapat bergerak dan bernapas",
    order: 21
  },
  {
    subject: "IPA",
    text: "Akar pada tumbuhan memiliki fungsi utama untuk...",
    options: JSON.stringify(["Berfotosintesis", "Menyerap air dan zat hara", "Menghasilkan bunga", "Menarik serangga"]),
    correctAnswer: "Menyerap air dan zat hara",
    order: 22
  },
  {
    subject: "IPA",
    text: "Perubahan wujud benda dari padat menjadi cair disebut...",
    options: JSON.stringify(["Membeku", "Menguap", "Mencair", "Mengembun"]),
    correctAnswer: "Mencair",
    order: 23
  },
  {
    subject: "IPA",
    text: "Contoh perubahan yang dapat kembali ke bentuk semula adalah...",
    options: JSON.stringify(["Kertas dibakar", "Es batu mencair", "Kayu lapuk", "Besi berkarat"]),
    correctAnswer: "Es batu mencair",
    order: 24
  },
  {
    subject: "IPA",
    text: "Energi yang digunakan manusia untuk melihat adalah...",
    options: JSON.stringify(["Energi panas", "Energi bunyi", "Energi cahaya", "Energi gerak"]),
    correctAnswer: "Energi cahaya",
    order: 25
  },
]

async function main() {
  console.log("Seeding academic questions...")
  
  // Clear existing questions to avoid duplicates
  await (prisma as any).academicQuestion.deleteMany()
  
  for (const q of academicQuestions) {
    await (prisma as any).academicQuestion.create({
      data: q
    })
  }
  
  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
