import { NextResponse } from "next/server";
import { bookings } from "@/lib/mock";
export async function GET() { return NextResponse.json(bookings); }
