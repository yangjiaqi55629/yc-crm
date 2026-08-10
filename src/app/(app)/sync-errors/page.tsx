import { CircleAlert, ShieldCheck } from "lucide-react";

import { ResolveSyncButton } from "@/components/sync/resolve-sync-button";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/lib/auth";
import { listSyncFailures } from "@/services/sync.service";

export default async function SyncErrorsPage() {
  await requireUser();
  const failures = listSyncFailures();
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">数据保障</p><h1>门户同步异常</h1><p>用于查看 CRM 接收端记录的异常。门户 Outbox 接入后，这里会同步展示失败与重试状态。</p></div></header><section className="panel sync-panel">{failures.length ? <div className="sync-list">{failures.map((failure) => <div className="sync-row" key={failure.id}><span className="sync-icon"><CircleAlert size={19} /></span><div><strong>{failure.reason}</strong><p>事件键：{failure.eventKey || "未解析"} · {formatDateTime(failure.createdAt)}</p></div><ResolveSyncButton id={failure.id} resolved={failure.status === "resolved"} /></div>)}</div> : <div className="empty-state"><ShieldCheck size={32} /><h3>没有 CRM 接收端异常</h3><p>门户留资接入后，签名校验、数据格式或入库失败会显示在这里。</p></div>}</section></div>;
}
