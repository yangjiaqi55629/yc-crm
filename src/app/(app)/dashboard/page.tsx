import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, Sparkles, UserPlus, Users } from "lucide-react";

import { StatusBadge } from "@/components/customers/status-badge";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/services/dashboard.service";

function MetricCard({
  label,
  value,
  href,
  icon,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Link href={href} className={`metric-card ${tone}`}>
      <span className="metric-icon">{icon}</span>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
      <ArrowRight size={16} className="metric-arrow" />
    </Link>
  );
}

export default async function DashboardPage() {
  await requireUser();
  const dashboard = getDashboardData();

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">销售工作台</p>
          <h1>今天，优先处理这些客户</h1>
          <p>系统已根据客户状态和下次跟进时间为你整理待办。</p>
        </div>
        <Link href="/customers/new" className="primary-button">
          <UserPlus size={17} /> 手动新增客户
        </Link>
      </header>

      <section className="metric-grid">
        <MetricCard label="今日新增" value={dashboard.metrics.todayNew} href="/customers" icon={<UserPlus size={20} />} tone="mint" />
        <MetricCard label="待跟进" value={dashboard.metrics.pending} href="/customers?reminder=pending" icon={<Users size={20} />} tone="sky" />
        <MetricCard label="今日应跟进" value={dashboard.metrics.todayFollowUps} href="/customers?reminder=today" icon={<CalendarClock size={20} />} tone="amber" />
        <MetricCard label="已逾期" value={dashboard.metrics.overdue} href="/customers?reminder=overdue" icon={<CircleAlert size={20} />} tone="rose" />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">今日优先级</p>
              <h2>今日应跟进</h2>
            </div>
            <Link href="/customers?reminder=today" className="text-link">查看全部</Link>
          </div>
          {dashboard.todayFollowUps.length ? (
            <div className="customer-compact-list">
              {dashboard.todayFollowUps.map((customer) => (
                <Link href={`/customers/${customer.id}`} className="compact-customer" key={customer.id}>
                  <span className="initial-avatar">{customer.name.slice(0, 1)}</span>
                  <span className="compact-main"><strong>{customer.name}</strong><small>{customer.phone}</small></span>
                  <span className="compact-side"><StatusBadge status={customer.status} /><small>{formatDateTime(customer.nextFollowUpAt)}</small></span>
                </Link>
              ))}
            </div>
          ) : <div className="empty-panel">今天暂时没有设定时间的跟进任务。</div>}
        </article>

        <article className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">请优先处理</p>
              <h2>已逾期</h2>
            </div>
            <Link href="/customers?reminder=overdue" className="text-link">查看全部</Link>
          </div>
          {dashboard.overdue.length ? (
            <div className="customer-compact-list">
              {dashboard.overdue.map((customer) => (
                <Link href={`/customers/${customer.id}`} className="compact-customer" key={customer.id}>
                  <span className="initial-avatar overdue">{customer.name.slice(0, 1)}</span>
                  <span className="compact-main"><strong>{customer.name}</strong><small>应跟进：{formatDateTime(customer.nextFollowUpAt)}</small></span>
                  <StatusBadge status={customer.status} />
                </Link>
              ))}
            </div>
          ) : <div className="empty-panel">没有逾期客户，保持得很好。</div>}
        </article>
      </section>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">客户池</p><h2>近期新增客户</h2></div>
          <Link href="/customers" className="text-link">进入客户管理</Link>
        </div>
        <div className="recent-grid">
          {dashboard.recent.map((customer) => (
            <Link href={`/customers/${customer.id}`} className="recent-card" key={customer.id}>
              <div className="recent-card-top"><span className="initial-avatar">{customer.name.slice(0, 1)}</span><StatusBadge status={customer.status} /></div>
              <strong>{customer.name}</strong><small>{customer.phone}</small>
              <span className="recent-date">{formatDateTime(customer.createdAt)}</span>
            </Link>
          ))}
          {!dashboard.recent.length && <div className="empty-panel wide">还没有客户。门户同步或手动新增后会出现在这里。</div>}
        </div>
      </section>

      <section className="ai-note">
        <Sparkles size={19} />
        <span><strong>AI 销售助手已就位。</strong> 进入任意客户详情，可生成客户画像、沟通重点和可复制的话术建议。</span>
      </section>
    </div>
  );
}
