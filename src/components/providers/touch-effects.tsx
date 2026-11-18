"use client"

import { useEffect } from "react"

const TARGET = 'button, [role="button"], a[href], summary, [data-ripple]'
const SKIP = ':disabled, [aria-disabled="true"], [data-no-ripple]'
const DURATION_MS = 550

/**
 * Ripple sentuhan global: satu listener di document, tanpa mengubah elemen yang diklik.
 * Overlay fixed dipotong mengikuti kotak dan radius target, jadi aman untuk elemen overflow-visible.
 */
export default function TouchEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const target = (e.target as Element | null)?.closest<HTMLElement>(TARGET)
      if (!target || target.matches(SKIP)) return

      const rect = target.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const style = getComputedStyle(target)
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y))

      const overlay = document.createElement("div")
      overlay.setAttribute("aria-hidden", "true")
      Object.assign(overlay.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: style.borderRadius,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: "2147483000",
      })

      const ripple = document.createElement("span")
      Object.assign(ripple.style, {
        position: "absolute",
        left: `${x - radius}px`,
        top: `${y - radius}px`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: "50%",
        backgroundColor: style.color,
        opacity: "0",
      })

      overlay.appendChild(ripple)
      document.body.appendChild(overlay)

      ripple
        .animate(
          [
            { transform: "scale(0)", opacity: 0.28 },
            { transform: "scale(1)", opacity: 0 },
          ],
          { duration: DURATION_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        )
        .finished.then(
          () => overlay.remove(),
          () => overlay.remove(),
        )
    }

    document.addEventListener("pointerdown", onPointerDown, { passive: true })
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  return null
}
