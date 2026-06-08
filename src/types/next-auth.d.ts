import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role: "admin" | "admin_sd" | "admin_smp" | "interviewer" | "unauthorized"
    } & DefaultSession["user"]
  }

  interface User {
    role: "admin" | "admin_sd" | "admin_smp" | "interviewer" | "unauthorized"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "admin_sd" | "admin_smp" | "interviewer" | "unauthorized"
  }
}
