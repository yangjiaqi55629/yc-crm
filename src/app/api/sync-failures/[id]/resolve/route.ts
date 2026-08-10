import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { resolveSyncFailure } from "@/services/sync.service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }
  const { id } = await context.params;
  resolveSyncFailure(id);
  return NextResponse.json({ success: true });
}
