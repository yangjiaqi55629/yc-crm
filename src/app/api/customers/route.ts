import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createCustomer, listCustomers } from "@/services/customer.service";
import { customerInputSchema } from "@/validators/customer";

function unauthorized() {
  return NextResponse.json({ error: "请先登录。" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await requireApiUser())) return unauthorized();
  const { searchParams } = new URL(request.url);
  const reminder = searchParams.get("reminder");
  return NextResponse.json(
    listCustomers({
      query: searchParams.get("query") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      reminder:
        reminder === "today" || reminder === "overdue" || reminder === "pending"
          ? reminder
          : undefined,
    }),
  );
}

export async function POST(request: Request) {
  if (!(await requireApiUser())) return unauthorized();
  const parsed = customerInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "客户资料有误。" }, { status: 400 });
  }

  try {
    const id = createCustomer({ ...parsed.data, source: parsed.data.source || "manual" });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "该手机号已存在客户档案。" }, { status: 409 });
    }
    throw error;
  }
}
