import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || []
const ADMIN_SD_EMAILS = process.env.ADMIN_SD_EMAILS?.split(",").map((e) => e.trim()) || []
const ADMIN_SMP_EMAILS = process.env.ADMIN_SMP_EMAILS?.split(",").map((e) => e.trim()) || []
const INTERVIEWER_EMAILS = process.env.INTERVIEWER_EMAILS?.split(",").map((e) => e.trim()) || []

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.role) {
        session.user.role = token.role as any
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        const email = user.email || ""
        if (ADMIN_EMAILS.includes(email)) {
          token.role = "admin" // Pusat
        } else if (ADMIN_SD_EMAILS.includes(email)) {
          token.role = "admin_sd"
        } else if (ADMIN_SMP_EMAILS.includes(email)) {
          token.role = "admin_smp"
        } else if (INTERVIEWER_EMAILS.includes(email)) {
          token.role = "interviewer"
        } else {
          token.role = "unauthorized"
        }
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
