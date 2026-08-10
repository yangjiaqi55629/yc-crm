import { NextResponse } from "next/server";

import { ingestPortalLead } from "@/services/customer.service";
import { recordSyncFailure, verifyPortalSignature } from "@/services/sync.service";
import { portalLeadEventSchema } from "@/validators/portal-event";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPortalSignature(request.headers, rawBody)) {
    return NextResponse.json({ error: "门户签名校验失败。" }, { status: 401 });
  }

  const parsed = portalLeadEventSchema.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "留资事件格式不正确。" }, { status: 400 });
  }

  try {
    const result = ingestPortalLead(parsed.data);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    recordSyncFailure({
      eventKey: parsed.data.eventKey,
      portalLeadId: parsed.data.portalLeadId,
      reason: error instanceof Error ? error.message : "CRM 接收门户留资失败。",
    });
    return NextResponse.json({ error: "CRM 接收留资失败。" }, { status: 500 });
  }
}
