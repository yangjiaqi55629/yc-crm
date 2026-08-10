import "server-only";

import { desc, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/constants";

function shanghaiDay(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function getDashboardData() {
  const now = new Date();
  const today = shanghaiDay(now.toISOString());
  const rows = db
    .select()
    .from(customers)
    .where(isNull(customers.archivedAt))
    .orderBy(desc(customers.createdAt))
    .all();

  const todayNew = rows.filter((customer) => shanghaiDay(customer.createdAt) === today);
  const todayFollowUps = rows.filter(
    (customer) => customer.nextFollowUpAt && shanghaiDay(customer.nextFollowUpAt) === today,
  );
  const overdue = rows.filter(
    (customer) => customer.nextFollowUpAt && new Date(customer.nextFollowUpAt) < now,
  );
  const pending = rows.filter(
    (customer) => customer.status === "pending" && !customer.nextFollowUpAt,
  );
  const highIntent = rows.filter((customer) => customer.status === "high_intent");

  const statusCounts = Object.fromEntries(
    CUSTOMER_STATUSES.map((status) => [
      status,
      rows.filter((customer) => customer.status === status).length,
    ]),
  ) as Record<CustomerStatus, number>;

  return {
    metrics: {
      todayNew: todayNew.length,
      pending: pending.length,
      todayFollowUps: todayFollowUps.length,
      overdue: overdue.length,
      highIntent: highIntent.length,
      total: rows.length,
      statusCounts,
    },
    todayFollowUps: todayFollowUps.slice(0, 8),
    overdue: overdue.sort((a, b) => (a.nextFollowUpAt ?? "").localeCompare(b.nextFollowUpAt ?? "")).slice(0, 8),
    recent: rows.slice(0, 6),
  };
}
