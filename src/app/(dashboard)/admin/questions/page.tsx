import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AdminQuestionsClient from "./questions-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manajemen Soal - Al Fakhir",
}

export default async function AdminQuestionsPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const questionsRaw = await prisma.formQuestion.findMany({
    orderBy: { order: "asc" }
  })

  const questions = questionsRaw.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : []
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <AdminQuestionsClient initialQuestions={questions as any} />
    </div>
  )
}
