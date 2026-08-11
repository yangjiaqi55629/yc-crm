"use client";

import { useState } from "react";
import { Check, RefreshCw, TriangleAlert } from "lucide-react";

import { formatDateTime } from "@/lib/datetime";

type PortalSyncFailure = {
  eventKey: string;
  portalLeadId: number | null;
  status: string;
  attempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
};

type PortalSyncInitialState = {
  configured: boolean;
  failures: PortalSyncFailure[];
  error?: string;
};

export function PortalSyncOutbox({ initial }: { initial: PortalSyncInitialState }) {
  const [configured, setConfigured] = useState(initial.configured);
  const [failures, setFailures] = useState(initial.failures);
  const [error, setError] = useState(initial.error ?? "");
  const [retrying, setRetrying] = useState("");

  async function refresh() {
    const response = await fetch("/api/integrations/portal/sync-status", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "暂时无法读取门户同步状态。"); return; }
    setConfigured(Boolean(body.configured));
    setFailures(Array.isArray(body.failures) ? body.failures : []);
    setError(body.error ?? "");
  }

  async function retry(eventKey: string) {
    setRetrying(eventKey);
    setError("");
    const response = await fetch("/api/integrations/portal/sync-retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventKey }),
    });
    const body = await response.json().catch(() => ({}));
    setRetrying("");
    if (!response.ok) { setError(body.error ?? "门户重新推送失败，请稍后再试。"); return; }
    await refresh();
  }

  return <section className="panel sync-panel"><div className="panel-heading"><div><p className="eyebrow">门户 Outbox</p><h2>门户推送状态</h2></div><button className="secondary-button small-button" onClick={() => void refresh()} type="button"><RefreshCw size={14} /> 刷新</button></div>{!configured ? <p className="muted">尚未配置门户同步管理地址。</p> : failures.length ? <div className="sync-list">{failures.map((failure) => <div className="sync-row" key={failure.eventKey}><span className="sync-icon"><TriangleAlert size={19} /></span><div><strong>{failure.status === "failed" ? "推送已停止，需人工处理" : "门户推送等待重试"}</strong><p>事件键：{failure.eventKey} · 已尝试 {failure.attempts} 次 · {formatDateTime(failure.createdAt)}</p>{failure.nextRetryAt && <p>下次自动重试：{formatDateTime(failure.nextRetryAt)}</p>}{failure.lastError && <p>{failure.lastError}</p>}</div><button className="secondary-button small-button" disabled={retrying === failure.eventKey} onClick={() => void retry(failure.eventKey)} type="button">{retrying === failure.eventKey ? "重试中…" : "重新推送"}</button></div>)}</div> : <div className="empty-state"><Check size={32} /><h3>门户推送正常</h3><p>没有等待重试的门户留资任务。</p></div>}{error && <p className="form-error">{error}</p>}</section>;
}
