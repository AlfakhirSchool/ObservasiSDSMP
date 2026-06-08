import { getCandidatesByRoom } from "@/lib/data-service"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room")
  
  if (!room) {
    return NextResponse.json({ error: "Room is required" }, { status: 400 })
  }
  
  try {
    const candidates = await getCandidatesByRoom(room)
    return NextResponse.json(candidates)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 })
  }
}
