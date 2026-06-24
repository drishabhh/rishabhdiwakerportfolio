import { isAdminAuthenticated } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
