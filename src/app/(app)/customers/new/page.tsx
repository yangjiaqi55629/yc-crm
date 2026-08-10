import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CustomerForm } from "@/components/customers/customer-form";
import { requireUser } from "@/lib/auth";

export default async function NewCustomerPage() {
  await requireUser();
  return (
    <div className="page-stack narrow-page">
      <header className="page-header"><div><Link href="/customers" className="back-link"><ArrowLeft size={16} /> 返回客户管理</Link><p className="eyebrow">客户档案</p><h1>手动新增客户</h1><p>线下获得的客户信息也可以在这里统一沉淀和跟进。</p></div></header>
      <section className="panel form-panel"><CustomerForm /></section>
    </div>
  );
}
