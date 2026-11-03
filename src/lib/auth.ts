import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { verifyDummyPassword, verifyPassword } from "@/lib/password"
import { allow, countHits, ipFromHeaders, recordHit } from "@/lib/rate-limit"
import { recordActivity } from "@/lib/activity"

const ROLE_MAP = {
  ADMIN: "admin", // Pusat
  ADMIN_SD: "admin_sd",
  ADMIN_SMP: "admin_smp",
  INTERVIEWER: "interviewer",
} as const

type Role = (typeof ROLE_MAP)[keyof typeof ROLE_MAP] | "unauthorized"

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts"
}

const LOGIN_WINDOW_SEC = 15 * 60
const MAX_FAILS_PER_USER = 5
const MAX_FAILS_PER_IP = 20

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const username = String(credentials?.username ?? "").trim().toLowerCase()
        const password = String(credentials?.password ?? "")
        if (!username || !password) return null

        // Batasi percobaan gagal per username dan per IP (disimpan di DB, berlaku lintas instance server).
        const ip = ipFromHeaders(request.headers)
        const userKey = `login:user:${username}`
        const ipKey = `login:ip:${ip}`
        const [userFails, ipFails] = await Promise.all([
          countHits(userKey, LOGIN_WINDOW_SEC),
          countHits(ipKey, LOGIN_WINDOW_SEC),
        ])
        if (userFails >= MAX_FAILS_PER_USER || ipFails >= MAX_FAILS_PER_IP) {
          // Satu catatan per 15 menit per username agar riwayat tidak dibanjiri percobaan yang terkunci.
          if (await allow(`locklog:${username}`, 1, LOGIN_WINDOW_SEC)) {
            await recordActivity({ action: "LOGIN_TERKUNCI", actorName: username, actorRole: "-", detail: "Terlalu banyak percobaan gagal", ip })
          }
          throw new TooManyAttempts()
        }

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
          if (!user?.passwordHash) verifyDummyPassword(password)
          await Promise.all([
            recordHit(userKey),
            recordHit(ipKey),
            recordActivity({
              action: "LOGIN_GAGAL",
              actorId: user?.id,
              actorName: user?.name ?? username,
              actorRole: user ? ROLE_MAP[user.role] : "-",
              detail: user ? "Password salah" : "Username tidak dikenal",
              ip,
            }),
          ])
          return null
        }

        await recordActivity({
          action: "LOGIN",
          actorId: user.id,
          actorName: user.name ?? user.username ?? username,
          actorRole: ROLE_MAP[user.role],
          ip,
        })
        return {
          id: user.id,
          name: user.name ?? user.username,
          // Dipakai sebagai identitas pewawancara di catatan; fallback ke username.
          email: user.email ?? user.username,
          role: ROLE_MAP[user.role],
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (typeof token.role === "string") {
        session.user.role = token.role as Role
      }
      if (token.sub) session.user.id = token.sub
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? "unauthorized"
      }
      return token
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isPublicPage = 
        nextUrl.pathname.startsWith("/academic") || 
        nextUrl.pathname.startsWith("/form") ||
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/api/public") ||
        nextUrl.pathname.startsWith("/logo") ||
        nextUrl.pathname === "/";
      
      if (isPublicPage) return true
      return isLoggedIn
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
