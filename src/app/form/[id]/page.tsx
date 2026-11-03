import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PublicFormClient from "./form-client"
import { verifyCandidateToken } from "@/lib/candidate-auth"
import { CandidateVerificationGate } from "@/components/candidate-verification-gate"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ role?: string; token?: string }>
}

export default async function PublicFormPage({ params, searchParams }: Props) {

  const { id } = await params
  const { role, token } = await searchParams

  // 1. Ambil data kandidat
  const candidate = await prisma.candidate.findUnique({
    where: { id },
  })

  if (!candidate) return notFound()

  // Verifikasi akses menggunakan token QR
  const isVerified = verifyCandidateToken(id, token)
  if (!isVerified) {
    return (
      <CandidateVerificationGate
        candidateId={id}
        candidateName={candidate.name}
        targetType="form"
        role={role}
      />
    )
  }

  const isStudentRole = role === "student" && candidate.level === "SMP"

  // 1.5. Cek apakah sudah dikunci secara manual oleh admin
  if (candidate.status === "REVIEWED" || candidate.status === "COMPLETED") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6 animate-in zoom-in duration-500">
          <div className="h-24 w-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-12 w-12 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase italic">Akses Terkunci</h1>
          <p className="text-slate-500 font-medium">
            Proses observasi untuk <span className="font-bold text-slate-900">{candidate.name}</span> telah dinyatakan selesai atau sedang dalam tinjauan Admin.
          </p>
        </div>
      </div>
    )
  }

  // 1.6. Cek apakah role ini sudah pernah mengisi
  const categoryToCheck = isStudentRole ? "SISWA" : "ORANG TUA"

  const existingAnswersCount = await prisma.formAnswer.count({
    where: {
      candidateId: id,
      question: {
        category: categoryToCheck
      }
    }
  })

  if (existingAnswersCount > 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6 animate-in zoom-in duration-500">
          <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase italic">Terima Kasih</h1>
          <p className="text-slate-500 font-medium">
            Formulir untuk <span className="font-bold text-slate-900">{isStudentRole ? "Calon Siswa" : "Orang Tua"}</span> sudah berhasil kami terima sebelumnya.
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Data Anda telah tersimpan dengan aman di sistem kami.
          </p>
        </div>
      </div>
    )
  }

  // 2. Tentukan filter kategori berdasarkan role
  // Jika role === student, ambil yang kategori Siswa-*
  // Jika role === parent atau role kosong, ambil yang kategori non-Siswa
  
  const questionsRaw = await prisma.formQuestion.findMany({
    where: {
      OR: [
        { level: candidate.level },
        { level: null }
      ],
      category: isStudentRole ? "SISWA" : "ORANG TUA"
    },
    orderBy: {
      order: 'asc'
    }
  })

  const questions = questionsRaw.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : []
  }))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-24">
        <PublicFormClient 
          candidate={candidate as any} 
          questions={questions as any} 
          role={isStudentRole ? "student" : "parent"}
          token={token}
        />
      </div>
    </div>
  )
}
