import "server-only";

import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { customers, followUps, timelineEvents } from "@/db/schema";
import { nowIso } from "@/lib/datetime";
import type { FollowUpInput } from "@/validators/follow-up";

function optional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseInputDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("日期格式不正确。");
  return parsed.toISOString();
}

export function addFollowUp(customerId: string, input: FollowUpInput) {
  const customer = db
    .select({ id: customers.id, status: customers.status })
    .from(customers)
    .where(eq(customers.id, customerId))
    .get();
  if (!customer) return null;

  const followUpId = crypto.randomUUID();
  const createdAt = nowIso();
  const followUpAt = parseInputDate(input.followUpAt);
  const nextFollowUpAt = input.nextFollowUpAt
    ? parseInputDate(input.nextFollowUpAt)
    : null;

  db.transaction((tx) => {
    tx.insert(followUps)
      .values({
        id: followUpId,
        customerId,
        channel: input.channel,
        content: input.content,
        outcome: optional(input.outcome),
        followUpAt,
        nextFollowUpAt,
        statusAfter: input.statusAfter ?? null,
        createdAt,
      })
      .run();

    tx.update(customers)
      .set({
        lastFollowUpAt: followUpAt,
        nextFollowUpAt,
        status: input.statusAfter ?? customer.status,
        updatedAt: createdAt,
      })
      .where(eq(customers.id, customerId))
      .run();

    tx.insert(timelineEvents)
      .values({
        id: crypto.randomUUID(),
        customerId,
        type: "follow_up_created",
        title: `新增${input.channel}跟进`,
        detail: input.content,
        relatedId: followUpId,
        occurredAt: followUpAt,
        createdAt,
      })
      .run();

    if (input.statusAfter && input.statusAfter !== customer.status) {
      tx.insert(timelineEvents)
        .values({
          id: crypto.randomUUID(),
          customerId,
          type: "status_changed",
          title: "跟进后更新客户状态",
          detail: `${customer.status} → ${input.statusAfter}`,
          relatedId: followUpId,
          occurredAt: followUpAt,
          createdAt,
        })
        .run();
    }
  });

  return followUpId;
}

export function listFollowUps(customerId: string) {
  return db
    .select()
    .from(followUps)
    .where(eq(followUps.customerId, customerId))
    .orderBy(desc(followUps.followUpAt))
    .all();
}
