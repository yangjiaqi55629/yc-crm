import "server-only";

export type PortalSyncFailure = {
  eventKey: string;
  portalLeadId: number | null;
  status: "pending" | "processing" | "retrying" | "failed";
  attempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
};

type PortalSyncConfiguration = {
  statusUrl: string;
  retryUrl: string;
  controlSecret: string;
};

function getConfiguration(): PortalSyncConfiguration | null {
  const statusUrl = process.env.PORTAL_SYNC_STATUS_URL?.trim();
  const retryUrl = process.env.PORTAL_SYNC_RETRY_URL?.trim();
  const controlSecret = process.env.PORTAL_SYNC_CONTROL_SECRET?.trim();
  if (!statusUrl && !retryUrl && !controlSecret) return null;
  if (!statusUrl || !retryUrl || !controlSecret) {
    throw new Error("门户同步管理配置不完整。");
  }
  return { statusUrl, retryUrl, controlSecret };
}

function asText(value: unknown, maxLength = 1000) {
  return typeof value === "string" ? value.slice(0, maxLength) : null;
}

function parseFailures(value: unknown): PortalSyncFailure[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { failures?: unknown }).failures)) {
    throw new Error("门户同步状态格式不正确。");
  }
  return (value as { failures: unknown[] }).failures.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const eventKey = asText(row.event_key, 200);
    const status = asText(row.status, 20);
    const createdAt = asText(row.created_at, 64);
    if (!eventKey || !createdAt || !["pending", "processing", "retrying", "failed"].includes(status ?? "")) return [];
    return [{
      eventKey,
      portalLeadId: typeof row.portal_lead_id === "number" ? row.portal_lead_id : null,
      status: status as PortalSyncFailure["status"],
      attempts: typeof row.attempts === "number" ? row.attempts : 0,
      nextRetryAt: asText(row.next_retry_at, 64),
      lastError: asText(row.last_error),
      createdAt,
    }];
  });
}

export async function getPortalSyncFailures() {
  const config = getConfiguration();
  if (!config) return { configured: false, failures: [] as PortalSyncFailure[] };

  try {
    const response = await fetch(config.statusUrl, {
      headers: { "x-portal-sync-control-secret": config.controlSecret },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`门户同步状态接口返回 HTTP ${response.status}`);
    return { configured: true, failures: parseFailures(await response.json()) };
  } catch {
    return { configured: true, failures: [] as PortalSyncFailure[], error: "暂时无法读取门户同步状态。" };
  }
}

export async function retryPortalSyncEvent(eventKey: string) {
  const config = getConfiguration();
  if (!config) throw new Error("门户同步管理尚未配置。");
  const response = await fetch(config.retryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-portal-sync-control-secret": config.controlSecret,
    },
    body: JSON.stringify({ eventKey }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("门户重新推送失败，请稍后再试。");
  return response.json() as Promise<unknown>;
}
