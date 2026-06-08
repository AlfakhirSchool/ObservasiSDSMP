import { getAllRooms } from "@/lib/data-service"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const level = searchParams.get("level")
  
  const rooms = await getAllRooms(level || undefined)
  return NextResponse.json(rooms)
}
