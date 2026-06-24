import { isAdminAuthenticated } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

async function getAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as { access_token?: string };
  return data.access_token as string;
}

async function findOrCreateFolder(accessToken: string, name: string, parentId?: string) {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false` +
      (parentId ? ` and '${parentId}' in parents` : ""),
  );
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchData = (await searchRes.json()) as { files?: Array<{ id: string }> };
  if (searchData.files?.length) return searchData.files[0]!.id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refreshToken = req.cookies.get("gdrive_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Not authenticated with Google Drive" }, { status: 401 });
  }

  const { companyName, fileName, base64 } = await req.json();
  const accessToken = await getAccessToken(refreshToken);

  const resumesFolderId = await findOrCreateFolder(accessToken, "Resumes");
  const companyFolderId = await findOrCreateFolder(accessToken, companyName, resumesFolderId);

  const boundary = "resumeboundary";
  const metadata = { name: fileName, parents: [companyFolderId] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/pdf\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64}\r\n` +
    `--${boundary}--`;

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!uploadRes.ok) {
    return NextResponse.json({ success: false, error: await uploadRes.text() }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
