"use client"

import { useState, useTransition, useCallback } from "react"
import {
  History,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  FileText,
  Sparkles,
  Key,
  GraduationCap,
  ClipboardList,
  SlidersHorizontal,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { ACTION_LABEL, type ActivityAction } from "@/lib/activity"
import { fetchActivityLogs } from "@/lib/activity-actions"
import { cn } from "@/lib/utils"

export interface LogItem {
  id: string
  createdAt: string
  actorId: string | null
  actorName: string
  actorRole: string
  action: string
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  detail: string | null
  ip: string | null
}

interface ActivityClientProps {
  initialLogs: LogItem[]
  initialNextCursor: string | null
}

const ACTION_GROUPS: { label: string; value: string }[] = [
  { label: "Semua Aksi", value: "ALL" },
  { label: "Login & Keamanan", value: "LOGIN" },
  { label: "Pengelolaan Siswa", value: "CALON" },
  { label: "Observasi & Catatan", value: "CATATAN" },
  { label: "Formulir & Tes Publik", value: "FORM" },
  { label: "Pengguna & Akun", value: "USER" },
  { label: "Soal", value: "SOAL" },
  { label: "Ringkasan AI", value: "AI" },
]

const ROLE_OPTIONS = [
  { label: "Semua Peran", value: "ALL" },
  { label: "Admin", value: "ADMIN" },
  { label: "Admin SD", value: "ADMIN_SD" },
  { label: "Admin SMP", value: "ADMIN_SMP" },
  { label: "Pewawancara", value: "INTERVIEWER" },
  { label: "Publik (Ortu/Siswa)", value: "publik" },
]

function getActionMeta(action: string) {
  const label = ACTION_LABEL[action as ActivityAction] || action

  if (action === "LOGIN") {
    return { label, color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ShieldCheck }
  }
  if (action === "LOGIN_GAGAL" || action === "LOGIN_TERKUNCI") {
    return { label, color: "bg-rose-50 text-rose-700 border-rose-200", icon: ShieldAlert }
  }
  if (action.startsWith("USER_")) {
    return { label, color: "bg-purple-50 text-purple-700 border-purple-200", icon: Key }
  }
  if (action === "CALON_TAMBAH" || action === "CALON_IMPOR") {
    return { label, color: "bg-blue-50 text-blue-700 border-blue-200", icon: UserPlus }
  }
  if (action === "CALON_HAPUS") {
    return { label, color: "bg-rose-50 text-rose-700 border-rose-200", icon: UserMinus }
  }
  if (action.startsWith("CALON_")) {
    return { label, color: "bg-sky-50 text-sky-700 border-sky-200", icon: UserCheck }
  }
  if (action === "CATATAN_KIRIM") {
    return { label, color: "bg-amber-50 text-amber-700 border-amber-200", icon: ClipboardList }
  }
  if (action === "RINGKASAN_AI") {
    return { label, color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Sparkles }
  }
  if (action === "FORM_ISI") {
    return { label, color: "bg-teal-50 text-teal-700 border-teal-200", icon: FileText }
  }
  if (action === "TES_AKADEMIK") {
    return { label, color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: GraduationCap }
  }

  return { label, color: "bg-slate-50 text-slate-700 border-slate-200", icon: History }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function ActivityClient({ initialLogs, initialNextCursor }: ActivityClientProps) {
  const [logs, setLogs] = useState<LogItem[]>(initialLogs)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [search, setSearch] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("ALL")
  const [selectedRole, setSelectedRole] = useState("ALL")
  const [isPending, startTransition] = useTransition()
  const [loadingMore, setLoadingMore] = useState(false)

  const reload = useCallback((customSearch = search, group = selectedGroup, role = selectedRole) => {
    startTransition(async () => {
      // Map group to action prefix if not specific action
      const actionParam = group === "ALL" ? undefined : group
      const roleParam = role === "ALL" ? undefined : role
      const res = await fetchActivityLogs({
        action: actionParam,
        role: roleParam,
        search: customSearch,
      })
      setLogs(res.items)
      setNextCursor(res.nextCursor)
    })
  }, [search, selectedGroup, selectedRole])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    reload(search, selectedGroup, selectedRole)
  }

  const handleGroupChange = (group: string) => {
    setSelectedGroup(group)
    reload(search, group, selectedRole)
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    reload(search, selectedGroup, role)
  }

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetchActivityLogs({
        action: selectedGroup === "ALL" ? undefined : selectedGroup,
        role: selectedRole === "ALL" ? undefined : selectedRole,
        search,
        cursor: nextCursor,
      })
      setLogs((prev) => [...prev, ...res.items])
      setNextCursor(res.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Aktivitas"
        description="Audit log sistem secara real-time: memantau login, pengisian formulir, nilai tes, catatan observasi, dan perubahan data."
        actions={
          <button
            type="button"
            onClick={() => reload()}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={cn(isPending && "animate-spin")} />
            Segarkan
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Cari pelaku, nama siswa, keterangan detail, atau IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filter kategori aksi"
              value={selectedGroup}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
            >
              {ACTION_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter peran pengguna"
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Cari
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table / List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada riwayat aktivitas"
            description="Tidak ada catatan audit yang cocok dengan kriteria pencarian atau filter yang dipilih."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const meta = getActionMeta(log.action)
              const Icon = meta.icon

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/70"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        meta.color
                      )}
                    >
                      <Icon size={18} />
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{log.actorName}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {log.actorRole}
                        </span>
                        <span
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-xs font-semibold",
                            meta.color
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600">
                        {log.targetLabel && (
                          <span className="font-medium text-slate-800">
                            {log.targetType ? `${log.targetType}: ` : ""}
                            {log.targetLabel}
                          </span>
                        )}
                        {log.targetLabel && log.detail && <span className="mx-1.5 text-slate-300">·</span>}
                        {log.detail && <span className="text-slate-600">{log.detail}</span>}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{formatDateTime(log.createdAt)}</span>
                        {log.ip && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-400">IP: {log.ip}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {nextCursor && (
          <div className="border-t border-slate-100 p-4 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Memuat data lama...
                </>
              ) : (
                "Muat lebih banyak riwayat"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
