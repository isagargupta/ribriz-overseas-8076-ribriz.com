import { NextResponse } from "next/server";

const CAPI_URL = `${process.env.CAPI_URL}/event`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(CAPI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CAPI_API_KEY!,
      },
      body: JSON.stringify(body),
    });
    return NextResponse.json({}, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
