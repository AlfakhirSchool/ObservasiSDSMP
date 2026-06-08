import { PrismaClient } from "@prisma/client"
import { config } from "dotenv"

config({ path: ".env.local" })

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Memulai seeding data awal (Prisma 7 + Adapter)...")

  // 1. Buat User Admin Default
  await prisma.user.upsert({
    where: { email: "smpialfakhir@gmail.com" },
    update: {},
    create: {
      email: "smpialfakhir@gmail.com",
      name: "Admin Al Fakhir",
      role: "ADMIN",
    },
  })

  // 2. Buat Pertanyaan Form Dasar
  const questions = [
    { text: "Apakah anak memiliki riwayat kesehatan khusus?", type: "long_text", category: "Kesehatan", order: 1 },
    { text: "Bagaimana kemandirian anak di rumah?", type: "long_text", category: "Karakter", order: 2 },
    { text: "Berapa jam anak belajar dalam sehari?", type: "choice", category: "Akademik", options: ["< 1 jam", "1-2 jam", "> 2 jam"], order: 3 },
    { text: "Apa harapan orang tua menyekolahkan anak di Al Fakhir?", type: "long_text", category: "Visi", order: 4 },
  ]

  for (const q of questions) {
    await prisma.formQuestion.create({
      data: {
        ...q,
        options: q.options ? JSON.stringify(q.options) : null,
      },
    })
  }

  // 3. Buat Satu Kandidat Contoh
  await prisma.candidate.create({
    data: {
      name: "Ahmad Rayyan",
      level: "SMP",
      status: "PENDING",
    },
  })

  console.log("✅ Seeding selesai! Data awal telah masuk ke Proxmox.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
