import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AcademicManagerClient from "@/app/(dashboard)/admin/academic/AcademicManagerClient"

export default async function AdminAcademicPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) {
    redirect("/login")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Manajemen Bank Soal</h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest mt-1">
            Pembuatan & Pengaturan Soal Akademik Al Fakhir
          </p>
        </div>
      </div>
      
      <AcademicManagerClient />
    </div>
  )
}
