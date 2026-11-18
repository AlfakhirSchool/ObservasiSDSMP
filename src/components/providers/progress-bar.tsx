"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"

/** Batas aman bila navigasi dibatalkan dan pathname tidak pernah berubah. */
const MAX_MS = 10_000

NProgress.configure({ showSpinner: false, easing: "ease", speed: 400, trickleSpeed: 180 })

export default function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Rute selesai berpindah: tutup bar.
  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  // App Router tidak punya event awal navigasi: mulai bar saat link internal diklik.
  useEffect(() => {
    let safety: number | undefined

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]")
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      NProgress.start()
      window.clearTimeout(safety)
      safety = window.setTimeout(() => NProgress.done(), MAX_MS)
    }

    document.addEventListener("click", onClick)
    return () => {
      document.removeEventListener("click", onClick)
      window.clearTimeout(safety)
    }
  }, [])

  return null
}
