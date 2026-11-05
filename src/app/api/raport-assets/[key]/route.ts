import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const KEYS = new Set(["sd-ttd-kepsek", "sd-stempel", "sd-ttd-ketua"])

/** Tanda tangan/stempel hanya dimuat oleh admin (untuk membuat PDF di browser); tidak pernah publik. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth()
  if (!session?.user?.role?.startsWith("admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { key } = await params
  if (!KEYS.has(key)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  const asset = await prisma.raportAsset.findUnique({ where: { key }, select: { mime: true, data: true } })
  if (!asset) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  return new NextResponse(Buffer.from(asset.data, "base64"), {
    headers: { "Content-Type": asset.mime, "Cache-Control": "private, max-age=3600" },
  })
}
