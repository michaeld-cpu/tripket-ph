import { NextResponse } from "next/server";
import { voyages } from "@/lib/mock";
export async function GET() { return NextResponse.json(voyages); }
