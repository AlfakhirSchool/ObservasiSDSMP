import ws from "ws"
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool, neonConfig } from "@neondatabase/serverless"

// Konfigurasi WebSocket untuk environment Node.js (non-edge)
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Kolam bawaan Prisma (jumlah CPU x 2 + 1 = 13 koneksi, tunggu 10 dtk) terlalu sempit: beberapa belas guru
 * membuka halaman bersamaan sudah menghabiskannya dan permintaan gagal dengan P2024. Hanya diterapkan bila
 * belum diatur di DATABASE_URL.
 */
const withPoolDefaults = (url: string | undefined) => {
  if (!url) return undefined
  const u = new URL(url)
  if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "30")
  if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "45")
  return u.toString()
}

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL
  
  if (connectionString && connectionString.includes("neon.tech")) {
    try {
      const pool = new Pool({ connectionString })
      const adapter = new PrismaNeon(pool as any)
      return new PrismaClient({
        adapter: adapter as any,
        log: ["error"],
      })
    } catch (e) {
      console.error("Prisma Neon Adapter error:", e)
    }
  }

  return new PrismaClient({
    log: ["error"],
    datasourceUrl: withPoolDefaults(connectionString),
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
