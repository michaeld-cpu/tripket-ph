import { NextResponse } from "next/server";
import { getStats } from "@/lib/mock";
export async function GET() { return NextResponse.json(getStats()); }
