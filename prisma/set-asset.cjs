// Simpan/ganti gambar aset raport (tanda tangan, stempel) ke database.
// Pemakaian: node prisma/set-asset.cjs <key> <berkas.png>
//   key: sd-ttd-kepsek | sd-stempel | sd-ttd-ketua
// Gambar sengaja TIDAK disimpan di repo (publik); hanya admin yang bisa memuatnya lewat /api/raport-assets/<key>.
const { readFileSync } = require("node:fs")
const { PrismaClient } = require("@prisma/client")

const KEYS = ["sd-ttd-kepsek", "sd-stempel", "sd-ttd-ketua"]
const MAX_BYTES = 512 * 1024

async function main() {
  const [key, file] = process.argv.slice(2)
  if (!KEYS.includes(key) || !file) {
    console.error("Pemakaian: node prisma/set-asset.cjs <key> <berkas.png>")
    console.error("key:", KEYS.join(" | "))
    process.exit(1)
  }
  const bytes = readFileSync(file)
  if (bytes.length > MAX_BYTES) throw new Error(`Berkas terlalu besar (${bytes.length} B, maks ${MAX_BYTES} B)`)
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Berkas harus PNG")

  const prisma = new PrismaClient()
  try {
    const data = bytes.toString("base64")
    await prisma.raportAsset.upsert({
      where: { key },
      update: { mime: "image/png", data },
      create: { key, mime: "image/png", data },
    })
    console.log(`Tersimpan: ${key} (${bytes.length} B)`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
