"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { STATUS_META } from "@/lib/constants";
import { crmUrl } from "@/lib/client-url";

type CustomerFormValues = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  region?: string | null;
  industry?: string | null;
  needDescription?: string | null;
  budgetRange?: string | null;
  status?: string;
  source?: string;
  tags?: string[];
};

export function CustomerForm({ initial, compact = false }: { initial?: CustomerFormValues; compact?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [tags, setTags] = useState(initial?.tags?.join("，") ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(crmUrl(initial?.id ? `/api/customers/${initial.id}` : "/api/customers"), {
      method: initial?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        tags: tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "保存失败，请稍后重试。");
      return;
    }
    if (initial?.id) router.refresh();
    else router.push(`/customers/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "customer-form compact" : "customer-form"}>
      <div className="form-grid">
        <label><span>客户姓名 <em>*</em></span><input name="name" defaultValue={initial?.name ?? ""} required placeholder="例如：张明" /></label>
        <label><span>手机号 <em>*</em></span><input name="phone" defaultValue={initial?.phone ?? ""} required placeholder="用于自动识别重复客户" /></label>
        <label><span>邮箱</span><input name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="name@example.com" /></label>
        <label><span>客户来源</span><select name="source" defaultValue={initial?.source ?? "manual"}><option value="manual">手动录入</option><option value="web">门户网站</option></select></label>
        <label><span>公司名称</span><input name="company" defaultValue={initial?.company ?? ""} placeholder="选填" /></label>
        <label><span>职位</span><input name="title" defaultValue={initial?.title ?? ""} placeholder="选填" /></label>
        <label><span>地区</span><input name="region" defaultValue={initial?.region ?? ""} placeholder="选填" /></label>
        <label><span>行业</span><input name="industry" defaultValue={initial?.industry ?? ""} placeholder="选填" /></label>
        <label><span>客户状态</span><select name="status" defaultValue={initial?.status ?? "pending"}>{Object.entries(STATUS_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></label>
        <label><span>预算范围</span><input name="budgetRange" defaultValue={initial?.budgetRange ?? ""} placeholder="例如：1 万以内" /></label>
        <label className="full-field"><span>客户标签</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="多个标签请用逗号分隔，例如：AI 配音，高优先级" /></label>
        <label className="full-field"><span>需求描述</span><textarea name="needDescription" defaultValue={initial?.needDescription ?? ""} rows={4} placeholder="记录客户当前需求、使用场景或关注点" /></label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions"><button className="primary-button" disabled={pending} type="submit"><Save size={17} /> {pending ? "正在保存…" : initial?.id ? "保存客户资料" : "创建客户"}</button></div>
    </form>
  );
}
