import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticate, getSessionCookieName, sessionCookieOptions } from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入账号和密码。" }, { status: 400 });
  }

  const result = await authenticate(parsed.data.username, parsed.data.password);
  if (!result) {
    return NextResponse.json({ error: "账号或密码错误。" }, { status: 401 });
  }

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(
    getSessionCookieName(),
    result.token,
    sessionCookieOptions(result.expiresAt),
  );
  return response;
}
