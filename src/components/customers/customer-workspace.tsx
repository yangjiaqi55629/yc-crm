"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ClipboardCheck, Copy, LoaderCircle, PencilLine, Sparkles } from "lucide-react";

import { CustomerForm } from "@/components/customers/customer-form";
import { StatusBadge } from "@/components/customers/status-badge";
import { FOLLOW_UP_CHANNELS, STATUS_META } from "@/lib/constants";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/datetime";
import type { AiInsight } from "@/services/ai.service";

type Customer = { id: string; name: string; phone: string; email: string | null; company: string | null; title: string | null; region: string | null; industry: string | null; needDescription: string | null; budgetRange: string | null; status: string; source: string; lastFollowUpAt: string | null; nextFollowUpAt: string | null; archivedAt: string | null; createdAt: string };
type FollowUp = { id: string; channel: string; content: string; outcome: string | null; followUpAt: string; nextFollowUpAt: string | null; statusAfter: string | null };
type Timeline = { id: string; title: string; detail: string | null; occurredAt: string; type: string };
type Lead = { id: string; rawName: string; rawPhone: string; rawEmail: string | null; submittedAt: string };
type Analysis = { createdAt: string; modelName: string; insight: AiInsight } | null;

export function CustomerWorkspace({
  customer,
  tags,
  followUpHistory,
  leadHistory,
  timeline,
  latestAnalysis,
}: {
  customer: Customer;
  tags: string[];
  followUpHistory: FollowUp[];
  leadHistory: Lead[];
  timeline: Timeline[];
  latestAnalysis: Analysis;
}) {
  const router = useRouter();
  const [showEditor, setShowEditor] = useState(false);
  const [followError, setFollowError] = useState("");
  const [followPending, setFollowPending] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>(latestAnalysis);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  async function addFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFollowError("");
    setFollowPending(true);
    const formData = new FormData(form);
    if (formData.get("statusAfter") === "") formData.delete("statusAfter");
    const data = Object.fromEntries(formData.entries());
    const response = await fetch(`/api/customers/${customer.id}/follow-ups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json().catch(() => ({}));
    setFollowPending(false);
    if (!response.ok) { setFollowError(body.error ?? "保存跟进失败。"); return; }
    form.reset();
    router.refresh();
  }

  async function generateAnalysis() {
    setAnalysisError("");
    setAnalysisPending(true);
    const response = await fetch(`/api/customers/${customer.id}/ai-analysis`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setAnalysisPending(false);
    if (!response.ok) { setAnalysisError(body.error ?? "生成销售建议失败。"); return; }
    setAnalysis(body);
    router.refresh();
  }

  async function archiveCustomer() {
    const verb = customer.archivedAt ? "恢复" : "归档";
    if (!window.confirm(`确认${verb}客户「${customer.name}」吗？`)) return;
    await fetch(`/api/customers/${customer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: !customer.archivedAt }) });
    router.push("/customers");
    router.refresh();
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return <div className="customer-workspace">
    <section className="customer-overview panel">
      <div className="customer-identity"><span className="hero-avatar">{customer.name.slice(0, 1)}</span><div><div className="identity-title"><h1>{customer.name}</h1><StatusBadge status={customer.status} /></div><p>{customer.company || "未填写公司"}{customer.title ? ` · ${customer.title}` : ""}{customer.region ? ` · ${customer.region}` : ""}</p><div className="contact-line"><span>{customer.phone}</span>{customer.email && <span>{customer.email}</span>}<span>{customer.source === "web" ? "门户网站" : "手动录入"}</span></div></div></div>
      <div className="overview-actions"><button className="secondary-button" onClick={() => setShowEditor(!showEditor)} type="button"><PencilLine size={16} /> 编辑资料</button><button className="icon-button" onClick={archiveCustomer} title={customer.archivedAt ? "恢复客户" : "归档客户"} type="button"><Archive size={17} /></button></div>
    </section>
    {showEditor && <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">编辑档案</p><h2>客户资料</h2></div></div><CustomerForm compact initial={{ ...customer, tags }} /></section>}

    <div className="detail-grid">
      <div className="detail-main">
        <section className="panel"><div className="panel-heading"><div><p className="eyebrow">销售推进</p><h2>新增跟进</h2></div><ClipboardCheck size={21} /></div><form className="followup-form" onSubmit={addFollowUp}><div className="form-grid"><label><span>沟通方式 <em>*</em></span><select name="channel" defaultValue="电话">{FOLLOW_UP_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}</select></label><label><span>跟进时间 <em>*</em></span><input name="followUpAt" type="datetime-local" defaultValue={toDateTimeLocalValue(new Date().toISOString())} required /></label><label><span>更新状态</span><select name="statusAfter" defaultValue=""><option value="">保持当前状态</option>{Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label><label><span>下次跟进时间</span><input name="nextFollowUpAt" type="datetime-local" defaultValue={toDateTimeLocalValue(customer.nextFollowUpAt)} /></label><label className="full-field"><span>沟通内容 <em>*</em></span><textarea name="content" rows={4} required placeholder="记录客户反馈、关键信息和本次沟通重点" /></label><label className="full-field"><span>跟进结果</span><textarea name="outcome" rows={2} placeholder="选填，例如：已确认需求，等待预算审批" /></label></div>{followError && <p className="form-error">{followError}</p>}<div className="form-actions"><button className="primary-button" type="submit" disabled={followPending}>{followPending ? "正在保存…" : "保存本次跟进"}</button></div></form></section>
        <section className="panel"><div className="panel-heading"><div><p className="eyebrow">全量记录</p><h2>客户时间线</h2></div><span className="muted">{timeline.length} 条事件 · {followUpHistory.length} 次跟进</span></div><div className="timeline">{timeline.map((item) => <div className="timeline-item" key={item.id}><span className="timeline-dot" /><div><div className="timeline-title"><strong>{item.title}</strong><time>{formatDateTime(item.occurredAt)}</time></div>{item.detail && <p>{item.detail}</p>}</div></div>)}{!timeline.length && <div className="empty-panel">暂无客户事件。</div>}</div></section>
      </div>
      <aside className="detail-side">
        <section className="panel info-panel"><p className="eyebrow">客户概览</p><dl><div><dt>需求描述</dt><dd>{customer.needDescription || "尚未记录"}</dd></div><div><dt>预算范围</dt><dd>{customer.budgetRange || "尚未记录"}</dd></div><div><dt>最近跟进</dt><dd>{formatDateTime(customer.lastFollowUpAt)}</dd></div><div><dt>下次跟进</dt><dd className={customer.nextFollowUpAt && new Date(customer.nextFollowUpAt) < new Date() ? "overdue-text" : ""}>{formatDateTime(customer.nextFollowUpAt)}</dd></div></dl><div className="tag-row top-gap">{tags.length ? tags.map((tag) => <span className="tag" key={tag}>{tag}</span>) : <span className="muted">尚未设置标签</span>}</div></section>
        <section className="panel ai-panel"><div className="panel-heading"><div><p className="eyebrow">AI 销售助手</p><h2>客户洞察</h2></div><Sparkles size={20} /></div><p className="muted">基于客户档案、留资历史和跟进记录生成建议。</p><button className="secondary-button full-width" onClick={generateAnalysis} disabled={analysisPending} type="button">{analysisPending ? <><LoaderCircle className="spin" size={16} /> 正在分析…</> : <><Sparkles size={16} /> 生成销售建议</>}</button>{analysisError && <p className="form-error">{analysisError}</p>}{analysis && <div className="insight"><p className="demo-note">{analysis.insight.isDemo ? "当前为本地规则建议，配置模型后将使用真实 AI 分析。" : `AI 分析结果 · ${analysis.modelName}`}</p><h3>客户画像</h3><p>{analysis.insight.portrait}</p><h3>下一步建议</h3><p>{analysis.insight.nextAction}</p><h3>建议话术</h3><blockquote>{analysis.insight.script}</blockquote><button className="copy-button" onClick={() => copyText(analysis.insight.script)} type="button"><Copy size={14} /> 复制话术</button></div>}</section>
        <section className="panel compact-history"><div className="panel-heading"><div><p className="eyebrow">门户留资</p><h2>留资历史</h2></div></div>{leadHistory.length ? <div className="mini-list">{leadHistory.map((event) => <div key={event.id}><strong>{event.rawName}</strong><span>{formatDateTime(event.submittedAt)}</span><small>{event.rawEmail || "未提供邮箱"}</small></div>)}</div> : <div className="empty-panel">该客户由手动录入。</div>}</section>
      </aside>
    </div>
  </div>;
}
