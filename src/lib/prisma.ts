import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Konfigurasi koneksi Prisma untuk PostgreSQL (khususnya Neon Database Serverless).
 * - connection_limit: kapasitas koneksi pool
 * - pool_timeout: batas tunggu antrean pool (detik)
 * - connect_timeout: batas waktu pembentukan TCP handshake awal (detik) untuk mengatasi cold-start compute Neon
 */
const withPoolDefaults = (url: string | undefined) => {
  if (!url) return undefined
  try {
    const u = new URL(url)
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "30")
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "45")
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15")
    return u.toString()
  } catch {
    return url
  }
}

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL
  return new PrismaClient({
    log: ["error"],
    datasourceUrl: withPoolDefaults(connectionString),
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
