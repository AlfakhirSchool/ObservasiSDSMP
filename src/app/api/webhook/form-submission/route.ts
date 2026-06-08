import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
    }

    console.log(
      `[WEBHOOK] Submisi formulir baru: ${body.candidateName} (${body.level})`
    )
    
    // Clear cache to show new data immediately
    revalidateTag("candidates", "default")
    revalidateTag("notes", "default")

    return NextResponse.json({
      success: true,
      message: `Diterima: ${body.candidateName}`,
    })
  } catch (error) {
    console.error("[WEBHOOK] Error:", error)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}
