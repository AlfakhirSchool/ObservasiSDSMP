import NextAuth, { DefaultSession } from "next-auth"

export type AppRole =
  | "admin"
  | "admin_sd"
  | "admin_smp"
  | "interviewer"
  | "quran_observer"
  | "committee"
  | "unauthorized"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      /** Username login; null bila akun tak punya username. Dipakai untuk aturan akses per akun. */
      username?: string | null
      role: AppRole
    } & DefaultSession["user"]
  }

  interface User {
    username?: string | null
    role: AppRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string | null
    role: AppRole
  }
}
