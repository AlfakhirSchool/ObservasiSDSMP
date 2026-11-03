import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Siswa Saya - Al Fakhir",
}

const UNITS = [
  {
    href: "/interviewer/sd",
    logo: "/logo-sd.png",
    alt: "Logo SD",
    name: "Unit SD",
    description: "Sekolah Dasar",
    hover: "hover:border-orange-400",
    cta: "text-orange-600",
  },
  {
    href: "/interviewer/smp",
    logo: "/logo-smp.png",
    alt: "Logo SMP",
    name: "Unit SMP",
    description: "Sekolah Menengah Pertama",
    hover: "hover:border-[#0D5C63]",
    cta: "text-[#0D5C63]",
  },
]

export default function InterviewerHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilih Unit Observasi"
        description="Pilih unit sekolah untuk mulai melakukan observasi dan mencatat hasil wawancara siswa."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {UNITS.map((unit) => (
          <Link
            key={unit.href}
            href={unit.href}
            className={`group flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${unit.hover}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                <img src={unit.logo} alt={unit.alt} className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">{unit.name}</h2>
                <p className="text-sm text-slate-500">{unit.description}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 text-sm font-semibold ${unit.cta}`}>
              Buka dashboard
              <ArrowRight size={16} aria-hidden="true" className="group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
