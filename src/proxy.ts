import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes — no auth needed
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/form") ||
    pathname.startsWith("/academic") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/form") ||
    pathname.startsWith("/api/academic") ||
    pathname.startsWith("/api/webhook")
  ) {
    return NextResponse.next()
  }

  // Not authenticated
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = session.user?.role

  // Unauthorized role
  if (role === "unauthorized") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", req.url))
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/interviewer", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
