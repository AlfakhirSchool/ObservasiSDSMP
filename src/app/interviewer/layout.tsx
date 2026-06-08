import { BrandLogo } from "@/components/layout/brand-logo"
import { LogOut } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"

export default async function InterviewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Dedicated Top Nav for Interviewers */}
      <nav className="h-[70px] bg-[#0D1B2A] text-white flex items-center justify-between px-8 sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/interviewer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <BrandLogo role="interviewer" />
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[13px] font-bold text-white">
              {session.user?.name?.replace('SMPI ', '')}
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Tim Observasi</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center font-black text-emerald-400">
            {session.user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="h-6 w-px bg-white/10" />
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {children}
      </main>
    </div>
  )
}
