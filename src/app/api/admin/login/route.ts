import { createSessionToken, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as { password?: string };
    if (!password || !verifyPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
