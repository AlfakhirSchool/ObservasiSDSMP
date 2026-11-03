import { cn } from "@/lib/utils"
import { getDisplayName, getRoleLabel, type UserRole } from "@/components/layout/user-display"

interface UserChipProps {
  name: string | null | undefined
  role: UserRole | undefined
  className?: string
}

export function UserChip({ name, role, className }: UserChipProps) {
  const displayName = getDisplayName(name)

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30"
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="max-w-[180px] truncate text-sm font-medium text-white" title={displayName}>
          {displayName}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">{getRoleLabel(role)}</div>
      </div>
    </div>
  )
}
