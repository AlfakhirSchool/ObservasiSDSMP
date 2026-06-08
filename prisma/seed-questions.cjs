const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Questions ONLY...')

  const questions = [
    // SD - ORANG TUA
    { text: "Apa alasan utama memilih SD Islam Modern Al Fakhir sebagai tempat belajar Ananda?", category: "ORANG TUA", type: "long_text", level: "SD", order: 1 },
    { text: "Bagaimana kesiapan Bapak/Ibu dalam mendukung program sekolah (Akademik & Diniyah)?", category: "ORANG TUA", type: "long_text", level: "SD", order: 2 },
    { text: "Apakah Ananda memiliki riwayat penyakit atau alergi tertentu?", category: "ORANG TUA", type: "long_text", level: "SD", order: 3 },
    { text: "Bagaimana pengawasan penggunaan gadget/media sosial bagi Ananda di rumah?", category: "ORANG TUA", type: "long_text", level: "SD", order: 4 },
    { text: "Sebutkan harapan terbesar Bapak/Ibu setelah Ananda bersekolah di Al Fakhir.", category: "ORANG TUA", type: "long_text", level: "SD", order: 5 },

    // SMP - ORANG TUA
    { text: "Apa alasan utama memilih SMP Islam Modern Al Fakhir sebagai tempat belajar Ananda?", category: "ORANG TUA", type: "long_text", level: "SMP", order: 1 },
    { text: "Bagaimana kesiapan Bapak/Ibu dalam mendukung program sekolah (Akademik & Diniyah)?", category: "ORANG TUA", type: "long_text", level: "SMP", order: 2 },
    { text: "Bagaimana sikap Ananda jika diberikan tanggung jawab atau tugas di rumah?", category: "ORANG TUA", type: "long_text", level: "SMP", order: 3 },
    { text: "Apakah Ananda memiliki riwayat penyakit atau alergi tertentu?", category: "ORANG TUA", type: "long_text", level: "SMP", order: 4 },
    { text: "Bagaimana pengawasan penggunaan gadget/media sosial bagi Ananda di rumah?", category: "ORANG TUA", type: "long_text", level: "SMP", order: 5 },

    // SMP - SISWA
    { text: "Mengapa kamu ingin bersekolah di SMP Islam Modern Al Fakhir? Apakah ini keinginanmu sendiri?", category: "SISWA", type: "long_text", level: "SMP", order: 1 },
    { text: "Apa hobi atau kegiatan yang paling kamu sukai saat waktu luang?", category: "SISWA", type: "long_text", level: "SMP", order: 2 },
    { text: "Sebutkan satu pencapaian atau hal yang pernah kamu lakukan dan membuatmu bangga.", category: "SISWA", type: "long_text", level: "SMP", order: 3 },
    { text: "Bagaimana caramu mengatur waktu antara belajar, bermain, dan ibadah?", category: "SISWA", type: "long_text", level: "SMP", order: 4 },
    { text: "Jika kamu menghadapi kesulitan dalam pelajaran, apa yang biasanya kamu lakukan?", category: "SISWA", type: "long_text", level: "SMP", order: 5 },
  ]

  for (const q of questions) {
    await prisma.formQuestion.create({ data: q })
  }

  console.log('Questions seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
