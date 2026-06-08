const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const { Pool } = require("pg")

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  const testData = [
    { name: "Ahmad Zaki", level: "SD", room: "R.01", selectedInterviewer: "Ustadz Arsyid, S.Pd" },
    { name: "Siti Aminah", level: "SD", room: "R.02", selectedInterviewer: "Ibu Astini, S.Pd" },
    { name: "Budi Santoso", level: "SMP", room: "R.03", selectedInterviewer: "Ibu Lu'lu' Luthfiyah, S.Pd" },
    { name: "Dewi Lestari", level: "SMP", room: "R.04", selectedInterviewer: "Arifah Hilyati, S.S, M.Pd" },
    { name: "Eko Prasetyo", level: "SMP", room: "R.01", selectedInterviewer: "Deny Rahmat, S.Sos.I" },
  ]

  for (const data of testData) {
    await prisma.candidate.create({
      data: {
        ...data,
        status: "PENDING"
      }
    })
  }
  console.log("5 test candidates created")
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
