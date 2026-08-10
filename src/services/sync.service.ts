import "server-only";

import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { syncFailures } from "@/db/schema";
import { nowIso } from "@/lib/datetime";

export function verifyPortalSignature(headers: Headers, rawBody: string) {
  const secret = process.env.PORTAL_SYNC_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const timestamp = headers.get("x-portal-timestamp");
  const signature = headers.get("x-portal-signature");
  if (!timestamp || !signature) return false;

  const receivedAt = Date.parse(timestamp);
  if (Number.isNaN(receivedAt) || Math.abs(Date.now() - receivedAt) > 5 * 60 * 1000) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function recordSyncFailure(input: {
  eventKey?: string | null;
  portalLeadId?: string | null;
  reason: string;
}) {
  db.insert(syncFailures)
    .values({
      id: crypto.randomUUID(),
      eventKey: input.eventKey ?? null,
      portalLeadId: input.portalLeadId ?? null,
      reason: input.reason.slice(0, 1000),
      status: "open",
      createdAt: nowIso(),
      resolvedAt: null,
    })
    .run();
}

export function listSyncFailures() {
  return db.select().from(syncFailures).orderBy(desc(syncFailures.createdAt)).all();
}

export function resolveSyncFailure(id: string) {
  db.update(syncFailures)
    .set({ status: "resolved", resolvedAt: nowIso() })
    .where(eq(syncFailures.id, id))
    .run();
}
