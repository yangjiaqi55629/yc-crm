"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(payload.error ?? "登录失败，请稍后重试。");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-aside">
        <div className="login-brand"><span className="brand-mark">元</span><span><strong>元川 AI</strong><small>轻量 CRM</small></span></div>
        <div className="login-copy"><p className="eyebrow">客户经营，从有序开始</p><h1>把每一次留资，变成持续的客户关系。</h1><p>集中管理客户、跟进计划与销售建议，让重要机会不被遗漏。</p></div>
        <div className="login-points"><span>客户档案</span><span>跟进提醒</span><span>AI 销售建议</span></div>
      </section>
      <section className="login-form-section">
        <form className="login-form" onSubmit={handleSubmit}>
          <div><p className="eyebrow">欢迎回来</p><h2>登录 CRM</h2><p className="muted">使用你的管理员账号进入客户工作台。</p></div>
          <label><span>账号</span><div className="input-with-icon"><UserRound size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></div></label>
          <label><span>密码</span><div className="input-with-icon"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full-width" disabled={pending} type="submit">{pending ? "正在登录…" : <>进入工作台 <ArrowRight size={17} /></>}</button>
          {process.env.NODE_ENV !== "production" && <p className="login-hint">首次本地运行默认账号为 admin，默认密码为 ChangeMe123!。</p>}
        </form>
      </section>
    </main>
  );
}
