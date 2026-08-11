import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { retryPortalSyncEvent } from "@/services/portal-sync-admin.service";

export async function POST(request: Request) {
  if (!(await requireApiUser())) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const body = await request.json().catch(() => null) as { eventKey?: unknown } | null;
  const eventKey = typeof body?.eventKey === "string" ? body.eventKey.trim() : "";
  if (!eventKey || eventKey.length > 200) return NextResponse.json({ error: "同步事件无效。" }, { status: 400 });
  try {
    await retryPortalSyncEvent(eventKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "门户重新推送失败，请稍后再试。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
