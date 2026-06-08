"use client"

import { InterviewerStats } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"

interface Props {
  interviewers: InterviewerStats[]
}

function StatusBadge({ status }: { status: InterviewerStats["status"] }) {
  if (status === "complete")
    return <Badge variant="success">🟢 Selesai</Badge>
  if (status === "in-progress")
    return <Badge variant="warning">🟡 Sedang Proses</Badge>
  return <Badge variant="muted">🔴 Belum Mulai</Badge>
}

export default function InterviewerMonitorClient({ interviewers }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitor Pewawancara</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pantau progres setiap pewawancara dalam proses observasi
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-4">
        {[
          {
            label: "Total Pewawancara",
            value: interviewers.length,
            color: "text-slate-700",
          },
          {
            label: "Selesai",
            value: interviewers.filter((i) => i.status === "complete").length,
            color: "text-emerald-600",
          },
          {
            label: "Sedang Proses",
            value: interviewers.filter((i) => i.status === "in-progress").length,
            color: "text-amber-600",
          },
          {
            label: "Belum Mulai",
            value: interviewers.filter((i) => i.status === "not-started").length,
            color: "text-rose-600",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm"
          >
            <span className={`text-xl font-bold ${color}`}>{value}</span>
            <span className="text-sm text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    "Pewawancara",
                    "Email",
                    "Ditugaskan",
                    "Formulir Masuk",
                    "Catatan Selesai",
                    "Tingkat Selesai",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {interviewers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      Belum ada data pewawancara
                    </td>
                  </tr>
                ) : (
                  interviewers.map((iv) => (
                    <tr
                      key={iv.email}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={iv.name} size="sm" />
                          <span className="font-semibold text-slate-900">
                            {iv.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {iv.email}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {iv.assigned}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-blue-600">
                          {iv.withResponses}
                        </span>
                        <span className="text-slate-400 text-xs">/{iv.assigned}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-emerald-600">
                          {iv.notesSubmitted}
                        </span>
                        <span className="text-slate-400 text-xs">/{iv.assigned}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                (iv.completionRate ?? 0) === 100
                                  ? "bg-emerald-500"
                                  : (iv.completionRate ?? 0) > 0
                                  ? "bg-amber-400"
                                  : "bg-slate-300"
                              }`}
                              style={{ width: `${iv.completionRate ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                            {iv.completionRate ?? 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={iv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
