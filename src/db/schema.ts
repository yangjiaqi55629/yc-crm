import {
  index,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("users_username_unique").on(table.username)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_index").on(table.userId),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    email: text("email"),
    company: text("company"),
    title: text("title"),
    region: text("region"),
    industry: text("industry"),
    needDescription: text("need_description"),
    budgetRange: text("budget_range"),
    status: text("status").notNull().default("pending"),
    source: text("source").notNull().default("manual"),
    lastFollowUpAt: text("last_follow_up_at"),
    nextFollowUpAt: text("next_follow_up_at"),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("customers_phone_normalized_unique").on(table.phoneNormalized),
    index("customers_status_index").on(table.status),
    index("customers_next_follow_up_index").on(table.nextFollowUpAt),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("tags_name_unique").on(table.name)],
);

export const customerTags = sqliteTable(
  "customer_tags",
  {
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.customerId, table.tagId] })],
);

export const leadEvents = sqliteTable(
  "lead_events",
  {
    id: text("id").primaryKey(),
    eventKey: text("event_key").notNull(),
    portalLeadId: text("portal_lead_id"),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    rawName: text("raw_name").notNull(),
    rawPhone: text("raw_phone").notNull(),
    rawEmail: text("raw_email"),
    source: text("source").notNull().default("web"),
    submittedAt: text("submitted_at").notNull(),
    receivedAt: text("received_at").notNull(),
  },
  (table) => [
    uniqueIndex("lead_events_event_key_unique").on(table.eventKey),
    index("lead_events_customer_id_index").on(table.customerId),
  ],
);

export const followUps = sqliteTable(
  "follow_ups",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    content: text("content").notNull(),
    outcome: text("outcome"),
    followUpAt: text("follow_up_at").notNull(),
    nextFollowUpAt: text("next_follow_up_at"),
    statusAfter: text("status_after"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("follow_ups_customer_id_index").on(table.customerId)],
);

export const timelineEvents = sqliteTable(
  "timeline_events",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    relatedId: text("related_id"),
    occurredAt: text("occurred_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("timeline_events_customer_occurred_index").on(
      table.customerId,
      table.occurredAt,
    ),
  ],
);

export const aiAnalyses = sqliteTable(
  "ai_analyses",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    inputSnapshot: text("input_snapshot").notNull(),
    outputJson: text("output_json").notNull(),
    modelName: text("model_name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("ai_analyses_customer_id_index").on(table.customerId)],
);

export const syncFailures = sqliteTable(
  "sync_failures",
  {
    id: text("id").primaryKey(),
    eventKey: text("event_key"),
    portalLeadId: text("portal_lead_id"),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at").notNull(),
    resolvedAt: text("resolved_at"),
  },
  (table) => [index("sync_failures_status_index").on(table.status)],
);
