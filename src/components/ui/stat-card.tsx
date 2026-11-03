import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const TONES = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
} as const

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  tone?: keyof typeof TONES
  /** Optional one-line explanation under the label. */
  hint?: string
  className?: string
}

export function StatCard({ label, value, icon: Icon, tone = "slate", hint, className }: StatCardProps) {
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">{value}</p>
        <p className="mt-1.5 truncate text-sm font-medium text-slate-600">{label}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  )
}
