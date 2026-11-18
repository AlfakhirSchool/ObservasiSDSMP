import Image from "next/image"
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonSummary() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-5 w-1/2 mt-4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

/** Kerangka halaman dashboard/pewawancara: judul, kartu statistik, lalu tabel. */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="page-enter space-y-6">
      <span className="sr-only">Memuat halaman…</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-4">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="hidden h-6 w-20 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Loader layar penuh bermerek untuk halaman publik (formulir, tes, surat). */
export function BrandLoader({ label = "Memuat…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="page-enter flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F8FAFC]"
    >
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--color-primary)]" />
        <Image
          src="/logo-alfakhir.png"
          alt=""
          width={44}
          height={44}
          priority
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
        />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}
