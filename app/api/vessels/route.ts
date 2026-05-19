import { NextResponse } from "next/server";
import { vessels } from "@/lib/mock";
export async function GET() { return NextResponse.json(vessels); }
