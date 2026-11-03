"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { startPolling } from "@/lib/polling"
import { Bell, QrCode, MessageSquare, UserCheck, Clock } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import { Dialog, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { LogoutButton } from "@/components/layout/logout-button"
import { UserChip } from "@/components/layout/user-chip"
import type { UserRole } from "@/components/layout/user-display"
import { cn } from "@/lib/utils"

interface HeaderProps {
  name: string | null | undefined
  role: UserRole
}

interface NotificationItem {
  id: string
  type: "note" | "form"
  title: string
  description: string
  time: string
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

function downloadQR(id: string, filename: string) {
  const canvas = document.getElementById(id)
  if (!(canvas instanceof HTMLCanvasElement)) return
  const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
  const downloadLink = document.createElement("a")
  downloadLink.href = pngUrl
  downloadLink.download = filename
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
}

export function Header({ name, role }: HeaderProps) {
  const [showQR, setShowQR] = useState(false)
  const [origin, setOrigin] = useState("")
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return // Diam saja jika gagal (biasanya karena server restart/dev mode)

      const data: unknown = await res.json()

      if (Array.isArray(data)) {
        const items = data as NotificationItem[]
        setNotifications((prev) => {
          if (prev.length > 0 && items.length > 0 && items[0].id !== prev[0].id) {
            setHasNew(true)
          }
          return items
        })
      }
    } catch {
      // Diam saja di mode dev
    }
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    fetchNotifications()
    return startPolling(fetchNotifications, 30000)
  }, [fetchNotifications])

  useEffect(() => {
    if (!showNotifications) return
    const onPointerDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNotifications(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [showNotifications])

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {/* QR Portal Utama */}
      <button
        type="button"
        onClick={() => setShowQR(true)}
        aria-label="Buka QR Portal"
        title="QR Portal"
        className={cn(
          "flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm font-medium text-white hover:bg-white/10 sm:px-3",
          FOCUS_RING
        )}
      >
        <QrCode size={16} aria-hidden="true" />
        <span className="hidden sm:inline xl:hidden">QR Portal</span>
      </button>

      {/* Bell with Notification Center */}
      <div className="relative" ref={bellRef}>
        <button
          type="button"
          onClick={() => {
            setShowNotifications((v) => !v)
            setHasNew(false)
          }}
          aria-label="Notifikasi"
          title="Notifikasi"
          aria-expanded={showNotifications}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
            showNotifications && "bg-white/10 text-white",
            FOCUS_RING
          )}
        >
          <Bell size={18} aria-hidden="true" />
          {hasNew && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0D1B2A]" />
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Aktivitas Terkini</span>
              <Badge variant="muted">{notifications.length}</Badge>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Belum ada aktivitas baru</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifications.map((notif) => (
                    <li key={notif.id} className="flex items-start gap-3 p-4 text-left hover:bg-slate-50">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          notif.type === "note" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                        )}
                      >
                        {notif.type === "note" ? (
                          <UserCheck size={14} aria-hidden="true" />
                        ) : (
                          <MessageSquare size={14} aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900">{notif.title}</div>
                        <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{notif.description}</div>
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                          <Clock size={12} aria-hidden="true" />
                          {new Date(notif.time).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-100 p-2 text-center">
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                )}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pengguna & keluar (desktop; di mobile ada di menu) */}
      <div className="hidden h-6 w-px bg-white/10 xl:block" />
      <UserChip name={name} role={role} className="hidden xl:flex" />
      <LogoutButton className="hidden xl:inline-flex [&>span]:hidden" />

      {/* Global QR Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <div className="border-b border-slate-100 px-6 py-5 text-center">
          <DialogTitle>Pusat Akses Portal QR</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">Scan untuk langsung menuju halaman portal</p>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Portal Observasi */}
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              <QRCodeCanvas id="qr-observasi" value={`${origin}/form`} size={160} level="H" includeMargin={true} />
            </div>
            <h4 className="mt-4 text-base font-semibold text-slate-900">Portal Observasi</h4>
            <p className="mt-0.5 text-sm text-slate-500">Formulir mandiri siswa &amp; orang tua</p>
            <button
              type="button"
              onClick={() => downloadQR("qr-observasi", "QR_Portal_Observasi.png")}
              className={cn(
                "mt-4 h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50",
                FOCUS_RING
              )}
            >
              Unduh QR
            </button>
          </div>

          {/* Portal Akademik */}
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              <QRCodeCanvas id="qr-akademik" value={`${origin}/academic`} size={160} level="H" includeMargin={true} />
            </div>
            <h4 className="mt-4 text-base font-semibold text-slate-900">Portal Akademik</h4>
            <p className="mt-0.5 text-sm text-slate-500">Ujian seleksi akademik</p>
            <button
              type="button"
              onClick={() => downloadQR("qr-akademik", "QR_Portal_Akademik.png")}
              className={cn(
                "mt-4 h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50",
                FOCUS_RING
              )}
            >
              Unduh QR
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => setShowQR(false)}
            className={cn(
              "h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700",
              FOCUS_RING
            )}
          >
            Selesai
          </button>
        </div>
      </Dialog>
    </div>
  )
}
