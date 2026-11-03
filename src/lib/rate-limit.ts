import { prisma } from "@/lib/prisma"

/** IP klien dari header proxy (Vercel mengisi x-forwarded-for). */
export function ipFromHeaders(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}

/** Jumlah kejadian untuk `key` dalam `windowSec` detik terakhir. */
export async function countHits(key: string, windowSec: number): Promise<number> {
  return prisma.rateLimitHit.count({ where: { key, createdAt: { gte: new Date(Date.now() - windowSec * 1000) } } })
}

export async function recordHit(key: string): Promise<void> {
  await prisma.rateLimitHit.create({ data: { key } })
  // Bersih-bersih ringan agar tabel tidak menumpuk: ~1 dari 50 pencatatan menghapus data > 1 hari.
  if (Math.random() < 0.02) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } })
  }
}

/**
 * Catat satu permintaan lalu putuskan boleh/tidaknya. Dipakai untuk endpoint yang dihitung per permintaan
 * (AI, form publik). Untuk login, hitung hanya kegagalan lewat countHits/recordHit.
 */
export async function allow(key: string, limit: number, windowSec: number): Promise<boolean> {
  if ((await countHits(key, windowSec)) >= limit) return false
  await recordHit(key)
  return true
}
