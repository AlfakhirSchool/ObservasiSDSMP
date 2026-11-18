import { auth } from "@/lib/auth"
import { committeeMayOpen } from "@/lib/permissions"
import { isQuranObserver, QURAN_HOME } from "@/lib/quran-observer"
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
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  const role = session.user?.role
  const username = session.user?.username

  // Unauthorized role
  if (role === "unauthorized") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", req.nextUrl))
  }

  // Panitia: hanya lihat Rekap, Monitor, Timer, Siswa. Selain itu ditolak.
  if (role === "committee") {
    if (req.method !== "GET" || !committeeMayOpen(pathname, req.method)) {
      if (pathname.startsWith("/api/") || req.method !== "GET") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      return NextResponse.redirect(new URL("/admin/rekap", req.nextUrl))
    }
    return NextResponse.next()
  }

  // Pewawancara Al-Qur'an: hanya boleh membuka /interviewer/quran dan menyimpan lewat /api/quran
  const quranOnly = role === "quran_observer" || (role === "interviewer" && isQuranObserver(username))
  if (quranOnly) {
    const isQuranRoute = pathname === "/interviewer/quran" || pathname.startsWith("/interviewer/quran/")
    const isQuranApi = pathname === "/api/quran"
    if (!isQuranRoute && !isQuranApi) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      return NextResponse.redirect(new URL(QURAN_HOME, req.nextUrl))
    }
    return NextResponse.next()
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && !role?.startsWith("admin")) {
    return NextResponse.redirect(new URL("/interviewer", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
