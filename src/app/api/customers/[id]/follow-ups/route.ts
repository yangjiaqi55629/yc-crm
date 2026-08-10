import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { addFollowUp, listFollowUps } from "@/services/follow-up.service";
import { followUpInputSchema } from "@/validators/follow-up";

type Context = { params: Promise<{ id: string }> };

function unauthorized() {
  return NextResponse.json({ error: "请先登录。" }, { status: 401 });
}

export async function GET(_request: Request, context: Context) {
  if (!(await requireApiUser())) return unauthorized();
  const { id } = await context.params;
  return NextResponse.json(listFollowUps(id));
}

export async function POST(request: Request, context: Context) {
  if (!(await requireApiUser())) return unauthorized();
  const { id } = await context.params;
  const parsed = followUpInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "跟进信息有误。" }, { status: 400 });
  }
  try {
    const followUpId = addFollowUp(id, parsed.data);
    if (!followUpId) return NextResponse.json({ error: "客户不存在。" }, { status: 404 });
    return NextResponse.json({ id: followUpId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存跟进失败。" },
      { status: 400 },
    );
  }
}
