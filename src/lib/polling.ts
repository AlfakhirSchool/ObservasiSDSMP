/**
 * Polling berkala yang berhenti saat tab tersembunyi dan segera menyegarkan ketika tab kembali aktif.
 * Dengan banyak pengguna membuka dashboard, ini memotong beban server dan database secara signifikan.
 * Mengembalikan fungsi pembersih untuk dipakai di cleanup useEffect.
 */
export function startPolling(fn: () => void, intervalMs: number): () => void {
  const tick = () => {
    if (!document.hidden) fn()
  }
  const interval = setInterval(tick, intervalMs)
  document.addEventListener("visibilitychange", tick)
  return () => {
    clearInterval(interval)
    document.removeEventListener("visibilitychange", tick)
  }
}
