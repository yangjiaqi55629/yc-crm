import Link from "next/link";
import { Filter, Plus, Search, UsersRound } from "lucide-react";

import { StatusBadge } from "@/components/customers/status-badge";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/lib/auth";
import { listCustomers, listCustomerTagNames } from "@/services/customer.service";

type SearchParams = Promise<{ query?: string; status?: string; source?: string; tag?: string; reminder?: "today" | "overdue" | "pending" }>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const filters = await searchParams;
  const customers = listCustomers(filters);
  const tagNames = listCustomerTagNames();

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">客户管理</p><h1>经营每一个客户机会</h1><p>管理门户留资、手动录入客户与所有后续跟进。</p></div><Link href="/customers/new" className="primary-button"><Plus size={17} /> 新增客户</Link></header>
      <section className="panel customer-list-panel">
        <form className="filter-bar" action="/customers" method="get">
          <label className="search-field"><Search size={18} /><input name="query" defaultValue={filters.query ?? ""} placeholder="搜索姓名、手机号或邮箱" /></label>
          <label><span className="sr-only">客户状态</span><select name="status" defaultValue={filters.status ?? ""}><option value="">全部状态</option><option value="pending">待跟进</option><option value="following">跟进中</option><option value="high_intent">高意向</option><option value="converted">已转化</option><option value="lost">无效/流失</option></select></label>
          <label><span className="sr-only">来源</span><select name="source" defaultValue={filters.source ?? ""}><option value="">全部来源</option><option value="web">门户网站</option><option value="manual">手动录入</option></select></label>
          <label><span className="sr-only">标签</span><select name="tag" defaultValue={filters.tag ?? ""}><option value="">全部标签</option>{tagNames.map((tag) => <option value={tag} key={tag}>{tag}</option>)}</select></label>
          <label><span className="sr-only">待办</span><select name="reminder" defaultValue={filters.reminder ?? ""}><option value="">全部客户</option><option value="pending">待跟进</option><option value="today">今日应跟进</option><option value="overdue">已逾期</option></select></label>
          <button className="secondary-button" type="submit"><Filter size={16} /> 筛选</button>
        </form>
        <div className="table-meta"><span>共 <strong>{customers.length}</strong> 位客户</span><span>手机号是客户自动去重依据</span></div>
        {customers.length ? <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>客户</th><th>状态</th><th>来源</th><th>标签</th><th>最近跟进</th><th>下次跟进</th><th /></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><Link href={`/customers/${customer.id}`} className="table-customer"><span className="initial-avatar">{customer.name.slice(0, 1)}</span><span><strong>{customer.name}</strong><small>{customer.phone}</small></span></Link></td><td><StatusBadge status={customer.status} /></td><td>{customer.source === "web" ? "门户网站" : "手动录入"}</td><td><div className="tag-row">{customer.tags.length ? customer.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>) : <span className="muted">—</span>}</div></td><td>{formatDateTime(customer.lastFollowUpAt)}</td><td>{formatDateTime(customer.nextFollowUpAt)}</td><td><Link href={`/customers/${customer.id}`} className="row-link">详情</Link></td></tr>)}</tbody></table></div> : <div className="empty-state"><UsersRound size={30} /><h3>还没有符合条件的客户</h3><p>门户留资同步或手动新增客户后，会显示在这里。</p><Link className="secondary-button" href="/customers/new">手动新增客户</Link></div>}
      </section>
    </div>
  );
}
