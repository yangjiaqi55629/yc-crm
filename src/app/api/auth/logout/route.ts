import { NextResponse } from "next/server";

import { clearSessionToken, getSessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  await clearSessionToken(request.headers.get("cookie")?.match(/yuanchuan_crm_session=([^;]+)/)?.[1]);

  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
