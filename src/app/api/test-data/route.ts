import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Clear existing test data if needed, or just add
    // To keep it simple, we'll just add 5 new ones
    
    const testData = [
      { name: "Ahmad Zaki", level: "SD", room: "R.01", selectedInterviewer: "Ustadz Arsyid, S.Pd" },
      { name: "Siti Aminah", level: "SD", room: "R.02", selectedInterviewer: "Ibu Astini, S.Pd" },
      { name: "Budi Santoso", level: "SMP", room: "R.03", selectedInterviewer: "Ibu Lu'lu' Luthfiyah, S.Pd" },
      { name: "Dewi Lestari", level: "SMP", room: "R.04", selectedInterviewer: "Arifah Hilyati, S.S, M.Pd" },
      { name: "Eko Prasetyo", level: "SMP", room: "R.01", selectedInterviewer: "Deny Rahmat, S.Sos.I" },
    ]

    for (const data of testData) {
      await prisma.candidate.create({
        data: {
          ...data,
          level: data.level as any,
          status: "PENDING"
        }
      })
    }

    return NextResponse.json({ success: true, message: "5 test candidates created" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Failed to create test data" }, { status: 500 })
  }
}
