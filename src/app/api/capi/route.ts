import { NextResponse } from "next/server";

const CAPI_URL = "https://capi.ribriz.com/event";

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
