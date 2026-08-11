import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getPortalSyncFailures } from "@/services/portal-sync-admin.service";

export async function GET() {
  if (!(await requireApiUser())) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  try {
    return NextResponse.json(await getPortalSyncFailures());
  } catch {
    return NextResponse.json({ error: "门户同步管理配置不完整。" }, { status: 503 });
  }
}
