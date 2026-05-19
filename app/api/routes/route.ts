import { NextResponse } from "next/server";
import { routes } from "@/lib/mock";
export async function GET() { return NextResponse.json(routes); }
