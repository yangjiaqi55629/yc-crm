"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UsersRound,
} from "lucide-react";

import { crmUrl } from "@/lib/client-url";

const navigation = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/customers", label: "客户管理", icon: UsersRound },
  { href: "/sync-errors", label: "同步异常", icon: ClipboardList },
];

export function AppShell({ username, children }: { username?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch(crmUrl("/api/auth/logout"), { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">元</span>
          <span>
            <strong>元川 AI</strong>
            <small>轻量 CRM</small>
          </span>
        </Link>
        <nav className="nav-list" aria-label="主导航">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/customers" && pathname.startsWith("/customers"));
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"}>
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="profile-row">
            <span className="avatar">{username?.slice(0, 1).toUpperCase() ?? "管"}</span>
            <span>
              <strong>{username ?? "管理员"}</strong>
              <small>管理员兼销售</small>
            </span>
          </div>
          <button className="logout-button" onClick={logout} type="button">
            <LogOut size={16} /> 退出登录
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="mobile-header">
          <span className="brand-mark">元</span>
          <span>元川 AI · CRM</span>
          <BellRing size={18} />
        </div>
        {children}
      </main>
    </div>
  );
}
