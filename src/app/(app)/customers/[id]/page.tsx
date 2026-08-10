import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { CustomerWorkspace } from "@/components/customers/customer-workspace";
import { requireUser } from "@/lib/auth";
import { getCustomerDetail } from "@/services/customer.service";
import { getLatestAiAnalysis } from "@/services/ai.service";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const detail = getCustomerDetail(id);
  if (!detail) notFound();
  const latestAnalysis = getLatestAiAnalysis(id);

  return <div className="page-stack"><Link href="/customers" className="back-link"><ArrowLeft size={16} /> 返回客户管理</Link><CustomerWorkspace {...detail} latestAnalysis={latestAnalysis ? { createdAt: latestAnalysis.createdAt, modelName: latestAnalysis.modelName, insight: latestAnalysis.insight } : null} /></div>;
}
