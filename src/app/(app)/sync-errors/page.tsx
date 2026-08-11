import { CircleAlert, ShieldCheck } from "lucide-react";

import { ResolveSyncButton } from "@/components/sync/resolve-sync-button";
import { PortalSyncOutbox } from "@/components/sync/portal-sync-outbox";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/lib/auth";
import { getPortalSyncFailures } from "@/services/portal-sync-admin.service";
import { listSyncFailures } from "@/services/sync.service";

export default async function SyncErrorsPage() {
  await requireUser();
  const failures = listSyncFailures();
  let portalOutbox;
  try { portalOutbox = await getPortalSyncFailures(); } catch { portalOutbox = { configured: true, failures: [], error: "门户同步管理配置不完整。" }; }
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">数据保障</p><h1>门户同步异常</h1><p>集中查看 CRM 接收端异常，以及门户 Outbox 的失败与重试状态。</p></div></header><PortalSyncOutbox initial={portalOutbox} /><section className="panel sync-panel">{failures.length ? <div className="sync-list">{failures.map((failure) => <div className="sync-row" key={failure.id}><span className="sync-icon"><CircleAlert size={19} /></span><div><strong>{failure.reason}</strong><p>事件键：{failure.eventKey || "未解析"} · {formatDateTime(failure.createdAt)}</p></div><ResolveSyncButton id={failure.id} resolved={failure.status === "resolved"} /></div>)}</div> : <div className="empty-state"><ShieldCheck size={32} /><h3>没有 CRM 接收端异常</h3><p>签名校验、数据格式或 CRM 入库失败会显示在这里。</p></div>}</section></div>;
}
