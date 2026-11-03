// Buat / perbarui akun login (username + password).
// Pemakaian: node prisma/set-user.cjs <username> <ROLE> "<Nama Tampilan>" [password]
//   ROLE: ADMIN | ADMIN_SD | ADMIN_SMP | INTERVIEWER
//   Untuk INTERVIEWER, Nama Tampilan HARUS sama persis dengan nilai
//   selectedInterviewer di data siswa (dipakai untuk membatasi akses siswa).
//   Password kosong => digenerate acak dan dicetak.
// Format hash harus sama dengan src/lib/password.ts.
const { randomBytes, scryptSync } = require("node:crypto")
const { PrismaClient } = require("@prisma/client")

const ROLES = ["ADMIN", "ADMIN_SD", "ADMIN_SMP", "INTERVIEWER"]

function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

async function main() {
  const [rawUsername, role, name, given] = process.argv.slice(2)
  const username = (rawUsername || "").trim().toLowerCase()
  if (!username || !ROLES.includes(role) || !name) {
    console.error('Pemakaian: node prisma/set-user.cjs <username> <ROLE> "<Nama>" [password]')
    console.error("ROLE:", ROLES.join(" | "))
    process.exit(1)
  }
  const password = given || randomBytes(6).toString("base64url")
  const prisma = new PrismaClient()
  try {
    const data = { name, role, passwordHash: hashPassword(password) }
    await prisma.user.upsert({
      where: { username },
      update: data,
      create: { username, ...data },
    })
    console.log(`${username}\t${role}\t${name}\t${given ? "(password sesuai input)" : password}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
