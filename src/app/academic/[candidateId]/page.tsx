import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import AcademicClient from "./AcademicClient"
import { CheckCircle2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AcademicPage({ params }: { params: { candidateId: string } }) {
  const { candidateId } = await params
  
  const candidate = await (prisma as any).candidate.findUnique({
    where: { id: candidateId },
    include: {
      academicTestResult: true
    }
  })
  
  if (!candidate) return notFound()
  if (candidate.level !== "SMP") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Akses Terbatas</h1>
          <p className="text-slate-500">Ujian akademik ini hanya tersedia untuk jenjang SMP.</p>
        </div>
      </div>
    )
  }

  // If already finished, show result or locked message
  if (candidate.academicTestResult) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in zoom-in duration-700">
          <div className="bg-white rounded-[48px] p-12 border border-slate-200 shadow-2xl shadow-emerald-500/10 relative overflow-hidden group">
            {/* Decorative background circle */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full transition-transform group-hover:scale-150 duration-700" />
            
            <div className="relative z-10 space-y-8">
              <div className="h-24 w-24 bg-emerald-500 rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 rotate-3">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Observasi Selesai!</h1>
                <p className="text-slate-400 font-bold text-sm leading-relaxed px-4">
                  Terima kasih <span className="text-emerald-600">{(candidate as any).name}</span>, jawaban Anda telah tersimpan dengan aman di sistem kami.
                </p>
              </div>

              
              <div className="pt-8">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                  Silahkan tutup halaman ini dan<br />kembali ke ruang observasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <AcademicClient candidate={candidate} />
}
