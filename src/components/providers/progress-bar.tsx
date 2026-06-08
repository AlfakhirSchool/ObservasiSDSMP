"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"

export default function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Configure NProgress
    NProgress.configure({ 
      showSpinner: false,
      easing: 'ease',
      speed: 500,
    })
  }, [])

  useEffect(() => {
    // Start progress on route change start
    // Note: In App Router, we don't have direct route change events like in Pages Router,
    // so we handle it by completing the progress when the pathname/searchParams change.
    NProgress.done()
    
    return () => {
      NProgress.start()
    }
  }, [pathname, searchParams])

  return null
}
