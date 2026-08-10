import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import {
  getCustomerDetail,
  setCustomerArchived,
  updateCustomer,
} from "@/services/customer.service";
import { customerPatchSchema } from "@/validators/customer";

type Context = { params: Promise<{ id: string }> };

function unauthorized() {
  return NextResponse.json({ error: "请先登录。" }, { status: 401 });
}

export async function GET(_request: Request, context: Context) {
  if (!(await requireApiUser())) return unauthorized();
  const { id } = await context.params;
  const customer = getCustomerDetail(id);
  if (!customer) return NextResponse.json({ error: "客户不存在。" }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PATCH(request: Request, context: Context) {
  if (!(await requireApiUser())) return unauthorized();
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);

  if (payload && typeof payload === "object" && "archived" in payload) {
    const result = setCustomerArchived(id, Boolean(payload.archived));
    if (!result) return NextResponse.json({ error: "客户不存在。" }, { status: 404 });
    return NextResponse.json({ id: result });
  }

  const parsed = customerPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "客户资料有误。" }, { status: 400 });
  }

  try {
    const result = updateCustomer(id, parsed.data);
    if (!result) return NextResponse.json({ error: "客户不存在。" }, { status: 404 });
    return NextResponse.json({ id: result });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "该手机号已存在客户档案。" }, { status: 409 });
    }
    throw error;
  }
}
