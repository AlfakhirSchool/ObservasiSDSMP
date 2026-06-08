const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  console.log("Seeding Database with Categorized Questions (Orang Tua & Siswa)...")

  // Reset
  await prisma.formAnswer.deleteMany({})
  await prisma.interviewerNote.deleteMany({})
  await prisma.candidate.deleteMany({})
  await prisma.formQuestion.deleteMany({})

  const questions = [
    // === SD UNIT ===
    { text: "Apa motivasi Bapak/Ibu menyekolahkan ananda di SD Islam Modern Al Fakhir?", category: "ORANG TUA", level: "SD", order: 1 },
    { text: "Bagaimana pola asuh yang diterapkan di rumah (disiplin, hadiah, hukuman)?", category: "ORANG TUA", level: "SD", order: 2 },
    { text: "Apakah ananda sudah mandiri dalam hal makan, mandi, dan berganti pakaian?", category: "ORANG TUA", level: "SD", order: 3 },
    { text: "Siapa yang paling banyak menghabiskan waktu bersama ananda di rumah?", category: "ORANG TUA", level: "SD", order: 4 },
    { text: "Bagaimana kebiasaan ibadah ananda di rumah (shalat, mengaji)?", category: "ORANG TUA", level: "SD", order: 5 },
    
    { text: "Halo sayang, siapa namanya? Coba sebutkan nama lengkapnya.", category: "SISWA", level: "SD", order: 6 },
    { text: "Sudah bisa baca huruf atau angka? Coba baca tulisan ini ya.", category: "SISWA", level: "SD", order: 7 },
    { text: "Apa hobi atau kegiatan yang paling kamu sukai di rumah?", category: "SISWA", level: "SD", order: 8 },
    { text: "Kalau sedang marah atau sedih, biasanya apa yang kamu lakukan?", category: "SISWA", level: "SD", order: 9 },

    // === SMP UNIT ===
    { text: "Apa alasan utama memilih SMP Islam Modern Al Fakhir sebagai tempat belajar ananda?", category: "ORANG TUA", level: "SMP", order: 1 },
    { text: "Bagaimana kesiapan Bapak/Ibu dalam mendukung program sekolah (akademik & diniyah)?", category: "ORANG TUA", level: "SMP", order: 2 },
    { text: "Bagaimana sikap ananda jika diberikan tanggung jawab atau tugas di rumah?", category: "ORANG TUA", level: "SMP", order: 3 },
    { text: "Apakah ananda memiliki riwayat penyakit atau alergi tertentu?", category: "ORANG TUA", level: "SMP", order: 4 },
    { text: "Bagaimana pengawasan penggunaan gadget/media sosial bagi ananda di rumah?", category: "ORANG TUA", level: "SMP", order: 5 },

    { text: "Apa motivasi terbesar kamu ingin bersekolah di SMP Al Fakhir?", category: "SISWA", level: "SMP", order: 6 },
    { text: "Sebutkan satu kelebihan dan satu kekurangan yang kamu miliki.", category: "SISWA", level: "SMP", order: 7 },
    { text: "Apa cita-cita kamu di masa depan dan bagaimana Al Fakhir bisa membantumu?", category: "SISWA", level: "SMP", order: 8 },
    { text: "Bagaimana cara kamu mengatur waktu antara belajar, hobi, dan ibadah?", category: "SISWA", level: "SMP", order: 9 },
    { text: "Coba ceritakan pengalaman paling membanggakan yang pernah kamu alami.", category: "SISWA", level: "SMP", order: 10 }
  ]

  console.log("Inserting Questions...")
  for (const q of questions) {
    await prisma.formQuestion.create({
      data: {
        text: q.text,
        type: "long_text",
        category: q.category,
        level: q.level,
        order: q.order
      }
    })
  }

  const interviewers = [
    "Ustadz Arsyid, S.Pd",
    "Mrs. Astini, S.Pd",
    "Mrs. Lu'lu' Luthfiyah, S.Pd",
    "Mrs. Arifah Hilyati, S.S, M.Pd",
    "Ustadz Deny Rahmat, S.Sos.I",
    "Mrs. Anggraini, A.Md",
    "Mrs. Siti Rokoyah, S.Pd"
  ]

  const demoCandidates = [
    {
      name: "Abdullah Hakim",
      level: "SD",
      interviewer: interviewers[0],
      responses: {
        "motivasi": "Kami ingin Abdullah mendapatkan pendidikan yang seimbang antara sains dan Al-Qur'an sejak dini.",
        "pola asuh": "Kami menerapkan disiplin yang lembut namun tegas, memberikan apresiasi jika dia berbuat baik.",
        "mandiri": "Alhamdulillah sudah mandiri, mandi dan makan sendiri tanpa perlu disuapi lagi.",
        "ibadah": "Sudah rajin ikut shalat jamaah ke masjid bersama ayahnya.",
        "nama": "Nama lengkap saya Abdullah Hakim bin Yusuf.",
        "baca": "Sudah lancar membaca iqro 5 dan buku cerita pendek.",
        "hobi": "Saya suka bermain lego dan menggambar pemandangan masjid.",
        "marah": "Biasanya saya diam dulu sebentar, baru cerita ke ibu."
      }
    },
    {
      name: "Kayla Az-Zahra",
      level: "SMP",
      interviewer: interviewers[2],
      responses: {
        "alasan": "Kami tertarik dengan program tahfidz dan pengembangan teknologi informasi di SMP Al Fakhir.",
        "dukungan": "Kami siap berpartisipasi aktif dalam kegiatan sekolah dan mengawal hafalan Kayla di rumah.",
        "tanggung jawab": "Kayla sangat bertanggung jawab, tugas sekolah selalu selesai tepat waktu tanpa disuruh.",
        "gadget": "Penggunaan gadget hanya saat akhir pekan dan untuk kebutuhan belajar saja.",
        "motivasi terbesar": "Saya ingin menjadi hafidzah sekaligus ahli teknologi yang bisa membantu dakwah.",
        "kelebihan": "Saya cepat belajar hal baru dan suka membantu teman yang kesulitan.",
        "cita-cita": "Menjadi Creative Director atau Programmer.",
        "mengatur waktu": "Saya membuat jadwal harian yang ditempel di meja belajar, mulai dari bangun tidur sampai tidur lagi.",
        "pengalaman": "Pernah menjuarai lomba desain poster tingkat kota tahun lalu."
      }
    }
  ]

  console.log("Inserting Demo Candidates and Answers...")
  for (const c of demoCandidates) {
    const candidate = await prisma.candidate.create({
      data: {
        name: c.name,
        level: c.level,
        selectedInterviewer: c.interviewer,
        status: "RESPONSE_RECEIVED"
      }
    })

    const qs = await prisma.formQuestion.findMany({ where: { level: c.level } })
    for (const q of qs) {
      let val = "Sangat positif dan menunjukkan kematangan yang baik."
      for (const [key, response] of Object.entries(c.responses)) {
        if (q.text.toLowerCase().includes(key.toLowerCase())) {
          val = response
          break
        }
      }
      await prisma.formAnswer.create({
        data: {
          candidateId: candidate.id,
          questionId: q.id,
          value: val
        }
      })
    }
  }

  console.log("Categorized Seeding Completed Successfully!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
