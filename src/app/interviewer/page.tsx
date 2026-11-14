import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ArrowRight,
  Award,
  BookOpen,
  GraduationCap,
  Sparkles,
  Table2,
  Users,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Dashboard Pewawancara — Al Fakhir",
}

export const dynamic = "force-dynamic"

export default async function InterviewerDashboardPortalPage() {
  const session = await auth()
  const user = session?.user
  if (!user) redirect("/login")

  const isAdmin = user.role.startsWith("admin")
  if (user.role !== "interviewer" && !isAdmin) redirect("/login")
  if (!isAdmin && !user.name) redirect("/login")

  // Ambil ringkasan data SD dan SMP secara cepat
  const [sdTotal, sdForms, sdDone, smpTotal, smpForms, smpDone] = await Promise.all([
    prisma.candidate.count({ where: { level: "SD" } }),
    prisma.candidate.count({ where: { level: "SD", status: { not: "PENDING" } } }),
    prisma.candidate.count({ where: { level: "SD", notes: { some: {} } } }),
    prisma.candidate.count({ where: { level: "SMP" } }),
    prisma.candidate.count({ where: { level: "SMP", status: { not: "PENDING" } } }),
    prisma.candidate.count({ where: { level: "SMP", notes: { some: {} } } }),
  ])

  return (
    <div className="space-y-8 py-2">
      {/* Sambutan & Pengantar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
              <Sparkles size={13} aria-hidden="true" />
              Sistem Observasi &amp; Seleksi Al Fakhir
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Selamat datang, {user.name}
            </h1>
            <p className="text-sm text-slate-500 sm:text-base">
              Silakan pilih unit di bawah untuk masuk ke ruang kerja observasi. Data SD dan SMP dipisahkan sepenuhnya agar proses penilaian fokus dan rapi.
            </p>
          </div>
        </div>
      </div>

      {/* Kartu Pilihan Unit: SD vs SMP */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* KARTU UNIT SD */}
        <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/40 via-white to-white p-6 shadow-sm transition hover:border-orange-400 hover:shadow-md sm:p-8">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-orange-500 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                Unit SD
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <Users size={24} aria-hidden="true" />
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Observasi Calon Siswa SD
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ruang kerja khusus calon siswa Sekolah Dasar. Mencakup pengamatan perilaku, kesiapan belajar, kuesioner orang tua, dan tes baca Al-Qur&apos;an.
              </p>
            </div>

            {/* Statistik Ringkas SD */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
              <div>
                <p className="text-xs font-medium text-orange-800">Total Siswa</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{sdTotal}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-800">Formulir</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{sdForms}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-800">Tercatat</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{sdDone}</p>
              </div>
            </div>

            {/* Menu Pintasan SD */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pilihan Menu SD:</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Link
                  href="/interviewer/sd"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-orange-400 hover:bg-orange-50/30"
                >
                  <Users size={14} className="text-orange-600" aria-hidden="true" />
                  <span>Koreksi Siswa</span>
                </Link>
                <Link
                  href="/interviewer/quran?unit=SD"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-orange-400 hover:bg-orange-50/30"
                >
                  <BookOpen size={14} className="text-orange-600" aria-hidden="true" />
                  <span>Al-Qur&apos;an SD</span>
                </Link>
                <Link
                  href="/interviewer/rekap?unit=SD"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-orange-400 hover:bg-orange-50/30"
                >
                  <Table2 size={14} className="text-orange-600" aria-hidden="true" />
                  <span>Rekap SD</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Link
              href="/interviewer/sd"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            >
              <span>Masuk ke Dashboard SD</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* KARTU UNIT SMP */}
        <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md sm:p-8">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-emerald-600 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                Unit SMP
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <GraduationCap size={24} aria-hidden="true" />
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Wawancara Calon Siswa SMP
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ruang kerja khusus calon siswa Sekolah Menengah Pertama. Mencakup wawancara calon siswa &amp; orang tua, hasil tes akademik, dan tes baca Al-Qur&apos;an.
              </p>
            </div>

            {/* Statistik Ringkas SMP */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div>
                <p className="text-xs font-medium text-emerald-800">Total Siswa</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{smpTotal}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-800">Formulir</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{smpForms}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-800">Tercatat</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{smpDone}</p>
              </div>
            </div>

            {/* Menu Pintasan SMP */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pilihan Menu SMP:</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Link
                  href="/interviewer/smp"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/30"
                >
                  <GraduationCap size={14} className="text-emerald-600" aria-hidden="true" />
                  <span>Koreksi Siswa</span>
                </Link>
                <Link
                  href="/interviewer/quran?unit=SMP"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/30"
                >
                  <BookOpen size={14} className="text-emerald-600" aria-hidden="true" />
                  <span>Al-Qur&apos;an SMP</span>
                </Link>
                <Link
                  href="/interviewer/rekap?unit=SMP&sumber=akademik"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/30"
                >
                  <Award size={14} className="text-emerald-600" aria-hidden="true" />
                  <span>Tes Akademik</span>
                </Link>
                <Link
                  href="/interviewer/rekap?unit=SMP"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/30"
                >
                  <Table2 size={14} className="text-emerald-600" aria-hidden="true" />
                  <span>Rekap SMP</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Link
              href="/interviewer/smp"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <span>Masuk ke Dashboard SMP</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
