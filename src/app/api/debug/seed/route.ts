import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Seeding via API...")
    
    // Clear
    await prisma.formAnswer.deleteMany({})
    await prisma.interviewerNote.deleteMany({})
    await prisma.candidate.deleteMany({})

    const sdQuestions = [
      "Bagaimana pola asuh yang diterapkan di rumah?",
      "Apakah anak sudah mandiri dalam hal makan dan mandi?",
      "Bagaimana respon anak jika keinginannya tidak dituruti?",
      "Apakah anak sudah mengenal huruf dan angka?",
      "Apa motivasi menyekolahkan anak di SD Islam Modern Al Fakhir?",
      "Bagaimana kebiasaan ibadah anak di rumah?",
      "Siapa yang paling banyak menghabiskan waktu bersama anak di rumah?"
    ]

    const smpQuestions = [
      "Ananda anak ke berapa dari berapa bersaudara?",
      "Dengan siapa ananda akrab di rumah?",
      "Siapakah figure yang dihormati/ditakuti Ananda?",
      "Apakah Ananda diizinkan bermain gadget?",
      "Pada jam berapa Ananda biasa tidur dan bangun tidur?",
      "Apakah hobi Ananda, Sebutkan! (bidang seni, olahraga, Bahasa, akademik)?",
      "Apakah Ananda melaksanakan sholat 5 waktu?",
      "Apakah Ananda sudah lancar membaca Al-Qur’an?",
      "Apakah ananda sudah memiliki hafalan Al-Qur’an?",
      "Mata pelajaran apakah yang paling disukai Ananda?",
      "Menurut Bapak/Ibu, bagaimana kesiapan anak menghadapi tuntutan belajar yang lebih mandiri di SMP?",
      "Apa alasan Bapak/Ibu memilih SMP Islam Modern Al Fakhir sebagai sekolah Ananda?",
      "Apa cita-cita Ananda?",
      "Mengapa Ananda ingin bersekolah di Al Fakhir?",
      "Seberapa yakin Ananda memilih sekolah ini?"
    ]

    for (const text of sdQuestions) {
      await prisma.formQuestion.upsert({
        where: { id: `sd-${text.slice(0, 10).replace(/ /g, '-')}` },
        update: {},
        create: { text, type: "long_text", category: "General", level: "SD" }
      })
    }
    for (const text of smpQuestions) {
      await prisma.formQuestion.upsert({
        where: { id: `smp-${text.slice(0, 10).replace(/ /g, '-')}` },
        update: {},
        create: { text, type: "long_text", category: "General", level: "SMP" }
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

    const demoData = [
      {
        name: "Abdullah Hakim",
        level: "SD",
        interviewer: interviewers[0],
        room: "R.01",
        responses: {
          "Bagaimana pola asuh yang diterapkan di rumah?": "Kami menerapkan pola asuh demokratis yang berlandaskan nilai-nilai Islam. Kami membiasakan diskusi dengan anak namun tetap memiliki batasan yang jelas mengenai disiplin ibadah dan waktu belajar.",
          "Apakah anak sudah mandiri dalam hal makan dan mandi?": "Alhamdulillah sudah mandiri. Mandi sudah bisa sendiri bersih, dan makan juga sudah tidak perlu disuapi, bahkan terkadang membantu membereskan piringnya sendiri.",
          "Bagaimana respon anak jika keinginannya tidak dituruti?": "Awalnya mungkin akan sedikit merajuk, tapi Abdullah sudah bisa diberikan pengertian melalui penjelasan logis mengapa hal tersebut belum bisa dipenuhi.",
          "Apakah anak sudah mengenal huruf dan angka?": "Sudah sangat lancar. Dia sudah bisa membaca buku cerita anak dan melakukan penjumlahan sederhana satu digit.",
          "Apa motivasi menyekolahkan anak di SD Islam Modern Al Fakhir?": "Kami mencari sekolah yang memiliki keseimbangan antara kurikulum umum yang modern dengan penanaman aqidah dan adab yang kuat. Al Fakhir adalah pilihan utama kami karena lingkungannya yang sholeh.",
          "Bagaimana kebiasaan ibadah anak di rumah?": "Sudah mulai rajin ikut ke masjid untuk shalat berjamaah bersama ayahnya, terutama maghrib dan isya. Dia juga semangat saat jam murojaah di rumah.",
          "Siapa yang paling banyak menghabiskan waktu bersama anak di rumah?": "Ibunya, namun ayahnya selalu menyempatkan waktu setelah pulang kerja untuk mendampingi belajar dan mengaji."
        }
      },
      {
        name: "Kayla Az-Zahra",
        level: "SMP",
        interviewer: interviewers[2],
        room: "R.03",
        responses: {
          "Ananda anak ke berapa dari berapa bersaudara?": "Anak pertama dari tiga bersaudara.",
          "Dengan siapa ananda akrab di rumah?": "Sangat akrab dengan Ibu karena sering membantu memasak dan berdiskusi tentang tugas sekolah.",
          "Siapakah figure yang dihormati/ditakuti Ananda?": "Ayah adalah sosok yang paling saya hormati karena ketegasannya, namun Ibu adalah tempat saya bercerita.",
          "Apakah Ananda diizinkan bermain gadget?": "Ya, saya diizinkan menggunakan laptop untuk belajar desain grafis, biasanya 2 jam sehari di bawah pengawasan orang tua.",
          "Pada jam berapa Ananda biasa tidur dan bangun tidur?": "Tidur jam 21.30 dan bangun jam 04.30 untuk persiapan shalat subuh berjamaah.",
          "Apakah hobi Ananda, Sebutkan!": "Hobi saya adalah menggambar ilustrasi digital, membaca novel sejarah, dan bermain bulu tangkis.",
          "Apakah Ananda melaksanakan sholat 5 waktu?": "Alhamdulillah shalat 5 waktu terjaga, dan saya selalu berusaha shalat tepat waktu tanpa perlu diingatkan lagi oleh orang tua.",
          "Apakah Ananda sudah lancar membaca Al-Qur’an?": "Sudah lancar dengan tajwid yang baik. Di rumah kami menggunakan metode Tilawati.",
          "Apakah ananda sudah memiliki hafalan Al-Qur’an?": "Sudah hafal 2 juz (Juz 30 dan Juz 29).",
          "Mata pelajaran apakah yang paling disukai Ananda?": "Matematika dan Bahasa Inggris.",
          "Menurut Bapak/Ibu, bagaimana kesiapan anak menghadapi tuntutan belajar yang lebih mandiri di SMP?": "Kami sangat yakin Kayla siap karena dia sudah terbiasa mengatur jadwal belajarnya sendiri tanpa perlu didorong-dorong lagi.",
          "Apa alasan Bapak/Ibu memilih SMP Islam Modern Al Fakhir sebagai sekolah Ananda?": "Kami ingin Kayla mendapatkan pendidikan agama yang kuat sekaligus menguasai teknologi, sesuai dengan visi sekolah ini.",
          "Apa cita-cita Ananda?": "Saya bercita-cita menjadi seorang Software Engineer yang bisa membantu aplikasi bermanfaat bagi umat Islam.",
          "Mengapa Ananda ingin bersekolah di Al Fakhir?": "Karena saya tertarik dengan program IT dan lingkungannya yang mendukung saya untuk terus meningkatkan hafalan Quran.",
          "Seberapa yakin Ananda memilih sekolah ini?": "Sangat yakin, 100% ingin sekolah di sini."
        }
      }
    ]

    for (const c of demoData) {
      const candidate = await prisma.candidate.create({
        data: {
          name: c.name,
          level: c.level as any,
          room: c.room,
          selectedInterviewer: c.interviewer,
          status: "RESPONSE_RECEIVED"
        }
      })

      const questions = await prisma.formQuestion.findMany({ where: { level: c.level as any } })
      
      for (const q of questions) {
        let answerValue = ""
        for (const [key, val] of Object.entries(c.responses)) {
          if (q.text.includes(key) || key.includes(q.text)) {
            answerValue = val
            break
          }
        }

        if (!answerValue) answerValue = "Sangat baik dan menunjukkan perkembangan karakter yang positif."

        await prisma.formAnswer.create({
          data: {
            candidateId: candidate.id,
            questionId: q.id,
            value: answerValue
          }
        })
      }
    }

    return NextResponse.json({ success: true, message: "Database seeded successfully!" })
  } catch (error: any) {
    console.error("Seed error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
