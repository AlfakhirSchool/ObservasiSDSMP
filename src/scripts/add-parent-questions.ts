import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Adding mandatory parent questions...")

  const questions = [
    {
      text: "Tulis nama ananda yang benar jika ada kesalahan penulisan nama dari kami",
      type: "text",
      category: "ORANG TUA",
      order: -2,
      // @ts-ignore
      isSystem: true,
    },
    {
      text: "Isi nomor telepon aktif yang bisa dihubungi",
      type: "text",
      category: "ORANG TUA",
      order: -1,
      // @ts-ignore
      isSystem: true,
    }
  ]

  for (const q of questions) {
    const existing = await prisma.formQuestion.findFirst({
      where: { text: q.text, category: q.category }
    })

    if (!existing) {
      await prisma.formQuestion.create({
        // @ts-ignore
        data: q
      })
      console.log(`Created: ${q.text}`)
    } else {
      await prisma.formQuestion.update({
        where: { id: existing.id },
        // @ts-ignore
        data: { isSystem: true, order: q.order }
      })
      console.log(`Updated to System: ${q.text}`)
    }
  }

  console.log("Done!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
