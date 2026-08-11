import "server-only";

import crypto from "node:crypto";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  isNotNull,
  lt,
  gte,
  like,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  customerTags,
  customers,
  followUps,
  leadEvents,
  tags,
  timelineEvents,
} from "@/db/schema";
import { nowIso } from "@/lib/datetime";
import { normalizePhone } from "@/lib/phone";
import type { CustomerInput } from "@/validators/customer";
import type { PortalLeadEvent } from "@/validators/portal-event";

type TimelineInput = {
  customerId: string;
  type: string;
  title: string;
  detail?: string | null;
  relatedId?: string | null;
  occurredAt?: string;
};

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function nullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function addTimeline(tx: Transaction, input: TimelineInput) {
  const timestamp = input.occurredAt ?? nowIso();
  tx.insert(timelineEvents)
    .values({
      id: crypto.randomUUID(),
      customerId: input.customerId,
      type: input.type,
      title: input.title,
      detail: input.detail ?? null,
      relatedId: input.relatedId ?? null,
      occurredAt: timestamp,
      createdAt: nowIso(),
    })
    .run();
}

function setTags(tx: Transaction, customerId: string, tagNames: string[]) {
  const normalizedNames = [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))];
  tx.delete(customerTags).where(eq(customerTags.customerId, customerId)).run();

  for (const name of normalizedNames) {
    tx.insert(tags)
      .values({ id: crypto.randomUUID(), name, createdAt: nowIso() })
      .onConflictDoNothing()
      .run();
  }

  if (!normalizedNames.length) return;

  const tagRows = tx.select().from(tags).where(inArray(tags.name, normalizedNames)).all();
  for (const tag of tagRows) {
    tx.insert(customerTags)
      .values({ customerId, tagId: tag.id })
      .onConflictDoNothing()
      .run();
  }
}

export function createCustomer(input: CustomerInput) {
  const now = nowIso();
  const id = crypto.randomUUID();
  const phoneNormalized = normalizePhone(input.phone);

  db.transaction((tx) => {
    tx.insert(customers)
      .values({
        id,
        name: input.name,
        phone: input.phone.trim(),
        phoneNormalized,
        email: nullable(input.email),
        company: nullable(input.company),
        title: nullable(input.title),
        region: nullable(input.region),
        industry: nullable(input.industry),
        needDescription: nullable(input.needDescription),
        budgetRange: nullable(input.budgetRange),
        status: input.status,
        source: input.source,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    setTags(tx, id, input.tags);
    addTimeline(tx, {
      customerId: id,
      type: "customer_created",
      title: input.source === "manual" ? "手动创建客户" : "创建客户",
      detail: `来源：${input.source}`,
      occurredAt: now,
    });
  });

  return id;
}

export function updateCustomer(id: string, input: Partial<CustomerInput>) {
  const existing = db.select().from(customers).where(eq(customers.id, id)).get();
  if (!existing) return null;

  const now = nowIso();
  const merged = {
    name: input.name ?? existing.name,
    phone: input.phone ?? existing.phone,
    email: input.email === undefined ? existing.email : nullable(input.email),
    company: input.company === undefined ? existing.company : nullable(input.company),
    title: input.title === undefined ? existing.title : nullable(input.title),
    region: input.region === undefined ? existing.region : nullable(input.region),
    industry: input.industry === undefined ? existing.industry : nullable(input.industry),
    needDescription:
      input.needDescription === undefined
        ? existing.needDescription
        : nullable(input.needDescription),
    budgetRange:
      input.budgetRange === undefined ? existing.budgetRange : nullable(input.budgetRange),
    status: input.status ?? existing.status,
    source: input.source ?? existing.source,
  };

  db.transaction((tx) => {
    tx.update(customers)
      .set({
        ...merged,
        phoneNormalized: normalizePhone(merged.phone),
        updatedAt: now,
      })
      .where(eq(customers.id, id))
      .run();

    if (input.tags !== undefined) setTags(tx, id, input.tags);

    addTimeline(tx, {
      customerId: id,
      type: "customer_updated",
      title: "更新客户资料",
      occurredAt: now,
    });

    if (input.status && input.status !== existing.status) {
      addTimeline(tx, {
        customerId: id,
        type: "status_changed",
        title: "更新客户状态",
        detail: `${existing.status} → ${input.status}`,
        occurredAt: now,
      });
    }
  });

  return id;
}

export function setCustomerArchived(id: string, archived: boolean) {
  const existing = db.select().from(customers).where(eq(customers.id, id)).get();
  if (!existing) return null;

  const now = nowIso();
  db.transaction((tx) => {
    tx.update(customers)
      .set({ archivedAt: archived ? now : null, updatedAt: now })
      .where(eq(customers.id, id))
      .run();
    addTimeline(tx, {
      customerId: id,
      type: archived ? "customer_archived" : "customer_restored",
      title: archived ? "归档客户" : "恢复客户",
      occurredAt: now,
    });
  });

  return id;
}

export type CustomerFilters = {
  query?: string;
  status?: string;
  source?: string;
  tag?: string;
  reminder?: "today" | "overdue" | "pending";
  archived?: boolean;
};

function getShanghaiDayBounds() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const day = `${part("year")}-${part("month")}-${part("day")}`;
  const start = new Date(`${day}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function listCustomers(filters: CustomerFilters = {}) {
  const conditions: SQL[] = [];
  const now = nowIso();

  if (filters.archived) conditions.push(isNotNull(customers.archivedAt));
  else conditions.push(isNull(customers.archivedAt));

  if (filters.status) conditions.push(eq(customers.status, filters.status));
  if (filters.source) conditions.push(eq(customers.source, filters.source));

  if (filters.query?.trim()) {
    const search = `%${filters.query.trim()}%`;
    conditions.push(
      or(like(customers.name, search), like(customers.phone, search), like(customers.email, search))!,
    );
  }

  if (filters.reminder === "overdue") {
    conditions.push(and(isNotNull(customers.nextFollowUpAt), lt(customers.nextFollowUpAt, now))!);
  }
  if (filters.reminder === "today") {
    const { start, end } = getShanghaiDayBounds();
    conditions.push(
      and(
        isNotNull(customers.nextFollowUpAt),
        gte(customers.nextFollowUpAt, start),
        lt(customers.nextFollowUpAt, end),
      )!,
    );
  }
  if (filters.reminder === "pending") {
    conditions.push(and(isNull(customers.nextFollowUpAt), eq(customers.status, "pending"))!);
  }

  const rows = db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.updatedAt))
    .all();

  const tagMap = getTagsForCustomerIds(rows.map((row) => row.id));
  const result = rows.map((row) => ({ ...row, tags: tagMap.get(row.id) ?? [] }));
  const tag = filters.tag?.trim();
  return tag ? result.filter((customer) => customer.tags.includes(tag)) : result;
}

export function listCustomerTagNames() {
  return db.select({ name: tags.name }).from(tags).orderBy(tags.name).all().map((row) => row.name);
}

function getTagsForCustomerIds(customerIds: string[]) {
  const tagMap = new Map<string, string[]>();
  if (!customerIds.length) return tagMap;

  const rows = db
    .select({ customerId: customerTags.customerId, name: tags.name })
    .from(customerTags)
    .innerJoin(tags, eq(customerTags.tagId, tags.id))
    .where(inArray(customerTags.customerId, customerIds))
    .all();

  for (const row of rows) {
    tagMap.set(row.customerId, [...(tagMap.get(row.customerId) ?? []), row.name]);
  }
  return tagMap;
}

export function getCustomerDetail(id: string) {
  const customer = db.select().from(customers).where(eq(customers.id, id)).get();
  if (!customer) return null;

  const tags = getTagsForCustomerIds([id]).get(id) ?? [];
  const leadHistory = db
    .select()
    .from(leadEvents)
    .where(eq(leadEvents.customerId, id))
    .orderBy(desc(leadEvents.submittedAt))
    .all();
  const followUpHistory = db
    .select()
    .from(followUps)
    .where(eq(followUps.customerId, id))
    .orderBy(desc(followUps.followUpAt))
    .all();
  const timeline = db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.customerId, id))
    .orderBy(desc(timelineEvents.occurredAt))
    .all();

  return { customer, tags, leadHistory, followUpHistory, timeline };
}

export function ingestPortalLead(input: PortalLeadEvent) {
  const duplicateEvent = db
    .select()
    .from(leadEvents)
    .where(eq(leadEvents.eventKey, input.eventKey))
    .get();
  if (duplicateEvent) {
    return { customerId: duplicateEvent.customerId, created: false, duplicate: true };
  }

  const normalizedPhone = normalizePhone(input.phone);
  const now = nowIso();
  let customerId = "";
  let created = false;

  db.transaction((tx) => {
    const existing = tx
      .select()
      .from(customers)
      .where(eq(customers.phoneNormalized, normalizedPhone))
      .get();

    if (existing) {
      customerId = existing.id;
      const update: Partial<typeof customers.$inferInsert> = { updatedAt: now };
      if (!existing.email && input.email) update.email = input.email;
      tx.update(customers).set(update).where(eq(customers.id, existing.id)).run();
    } else {
      customerId = crypto.randomUUID();
      created = true;
      tx.insert(customers)
        .values({
          id: customerId,
          name: input.name,
          phone: input.phone,
          phoneNormalized: normalizedPhone,
          email: nullable(input.email),
          status: "pending",
          source: input.source || "web",
          createdAt: now,
          updatedAt: now,
        })
        .run();
      addTimeline(tx, {
        customerId,
        type: "customer_created",
        title: "门户新建客户",
        detail: `来源：${input.source || "web"}`,
        occurredAt: now,
      });
    }

    const eventId = crypto.randomUUID();
    tx.insert(leadEvents)
      .values({
        id: eventId,
        eventKey: input.eventKey,
        portalLeadId: input.portalLeadId ?? null,
        customerId,
        rawName: input.name,
        rawPhone: input.phone,
        rawEmail: nullable(input.email),
        source: input.source || "web",
        submittedAt: input.submittedAt,
        receivedAt: now,
      })
      .run();
    addTimeline(tx, {
      customerId,
      type: "portal_lead_received",
      title: created ? "收到门户留资" : "收到门户再次留资",
      detail: `姓名：${input.name}；邮箱：${input.email || "未提供"}`,
      relatedId: eventId,
      occurredAt: input.submittedAt,
    });
  });

  return { customerId, created, duplicate: false };
}
