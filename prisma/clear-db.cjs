const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Clearing database...')
  
  // Order matters because of foreign keys
  await prisma.formAnswer.deleteMany({})
  await prisma.interviewerNote.deleteMany({})
  await prisma.aiSummary.deleteMany({})
  await prisma.candidate.deleteMany({})
  await prisma.formQuestion.deleteMany({})
  
  console.log('Database cleared successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
