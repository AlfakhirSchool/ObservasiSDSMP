import ws from "ws"
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool, neonConfig } from "@neondatabase/serverless"

// Konfigurasi WebSocket untuk environment Node.js (non-edge)
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
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
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
