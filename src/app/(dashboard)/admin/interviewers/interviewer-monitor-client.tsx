"use client"

import { CheckCircle2, CircleDashed, Loader2, UserCheck, Users } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn, getInitials } from "@/lib/utils"
import type { InterviewerMonitorRow } from "@/lib/data-service"

interface Props {
  interviewers: InterviewerMonitorRow[]
}

type MonitorStatus = "none" | "done" | "progress" | "idle"

const STATUS_META: Record<MonitorStatus, { label: string; pill: string; bar: string }> = {
  none: {
    label: "Belum ada siswa",
    pill: "bg-slate-50 text-slate-600 ring-slate-200",
    bar: "bg-slate-300",
  },
  done: {
    label: "Selesai",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bar: "bg-emerald-500",
  },
  progress: {
    label: "Sedang proses",
    pill: "bg-blue-50 text-blue-700 ring-blue-200",
    bar: "bg-blue-500",
  },
  idle: {
    label: "Belum mulai",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    bar: "bg-amber-400",
  },
}

function getStatus(iv: InterviewerMonitorRow): MonitorStatus {
  if (iv.assigned === 0) return "none"
  if (iv.notesDone === iv.assigned) return "done"
  if (iv.notesDone > 0 || iv.withForm > 0) return "progress"
  return "idle"
}

export default function InterviewerMonitorClient({ interviewers }: Props) {
  const rows = interviewers.map((iv) => ({ iv, status: getStatus(iv) }))
  const count = (s: MonitorStatus) => rows.filter((r) => r.status === s).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitor Pewawancara"
        description="Pantau progres setiap pewawancara dalam proses observasi"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total pewawancara" value={interviewers.length} icon={Users} tone="slate" />
        <StatCard label="Selesai" value={count("done")} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Sedang proses" value={count("progress")} icon={Loader2} tone="blue" />
        <StatCard label="Belum mulai" value={count("idle")} icon={CircleDashed} tone="amber" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Belum ada pewawancara"
            description="Akun pewawancara akan muncul di sini setelah dibuat."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pewawancara</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ditugaskan</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Formulir masuk</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan selesai</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Progres</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ iv, status }) => {
                  const meta = STATUS_META[status]
                  return (
                    <tr key={iv.username} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700"
                          >
                            {getInitials(iv.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{iv.name}</p>
                            <p className="truncate text-xs text-slate-500">@{iv.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">{iv.assigned}</td>
                      <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                        <span className="font-semibold text-slate-900">{iv.withForm}</span>
                        <span className="text-slate-500"> / {iv.assigned}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                        <span className="font-semibold text-slate-900">{iv.notesDone}</span>
                        <span className="text-slate-500"> / {iv.assigned}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"
                            role="progressbar"
                            aria-valuenow={iv.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Progres ${iv.name}`}
                          >
                            <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${iv.progress}%` }} />
                          </div>
                          <span className="w-10 text-sm font-medium text-slate-700 tabular-nums">{iv.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", meta.pill)}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
