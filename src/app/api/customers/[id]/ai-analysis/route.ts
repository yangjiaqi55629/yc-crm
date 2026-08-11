import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { AiProviderError, generateAiAnalysis, getLatestAiAnalysis } from "@/services/ai.service";

type Context = { params: Promise<{ id: string }> };

function unauthorized() {
  return NextResponse.json({ error: "请先登录。" }, { status: 401 });
}

export async function GET(_request: Request, context: Context) {
  if (!(await requireApiUser())) return unauthorized();
  const { id } = await context.params;
  return NextResponse.json(getLatestAiAnalysis(id));
}

export async function POST(_request: Request, context: Context) {
  if (!(await requireApiUser())) return unauthorized();
  const { id } = await context.params;
  try {
    const analysis = await generateAiAnalysis(id);
    if (!analysis) return NextResponse.json({ error: "客户不存在。" }, { status: 404 });
    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    const message = error instanceof AiProviderError ? error.message : "生成 AI 建议失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
