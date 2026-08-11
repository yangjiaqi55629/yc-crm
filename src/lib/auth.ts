import "server-only";

import crypto from "node:crypto";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { nowIso } from "@/lib/datetime";

const SESSION_COOKIE = "yuanchuan_crm_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function shouldUseSecureSessionCookie() {
  const configured = process.env.CRM_SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getBootstrapCredentials() {
  const username = process.env.CRM_ADMIN_USERNAME ?? "admin";
  const configuredPassword = process.env.CRM_ADMIN_PASSWORD;

  if (process.env.NODE_ENV === "production" && !configuredPassword) {
    throw new Error("生产环境必须设置 CRM_ADMIN_PASSWORD。");
  }

  return {
    username,
    password: configuredPassword ?? "ChangeMe123!",
  };
}

export async function ensureBootstrapUser() {
  const existing = db.select({ id: users.id }).from(users).limit(1).get();
  if (existing) return;

  const credentials = getBootstrapCredentials();
  db.insert(users)
    .values({
      id: crypto.randomUUID(),
      username: credentials.username,
      passwordHash: await bcrypt.hash(credentials.password, 12),
      createdAt: nowIso(),
    })
    .run();
}

export async function authenticate(username: string, password: string) {
  await ensureBootstrapUser();

  const user = db
    .select()
    .from(users)
    .where(eq(users.username, username.trim()))
    .get();

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  db.insert(sessions)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: nowIso(),
    })
    .run();

  return { token, expiresAt, user: { id: user.id, username: user.username } };
}

export function sessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(),
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export async function clearSessionToken(token?: string) {
  if (token) {
    db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
  }
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const activeSession = db
    .select({
      userId: users.id,
      username: users.username,
      sessionId: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, nowIso()),
      ),
    )
    .get();

  if (!activeSession) return null;
  return { id: activeSession.userId, username: activeSession.username };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}
