import "server-only";

import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { aiAnalyses, customers, followUps, leadEvents, timelineEvents } from "@/db/schema";
import { nowIso } from "@/lib/datetime";

export type AiInsight = {
  portrait: string;
  needs: string[];
  intent: string;
  basis: string[];
  communicationFocus: string[];
  questions: string[];
  nextAction: string;
  script: string;
  isDemo: boolean;
};

function createRuleBasedInsight(input: {
  name: string;
  company: string | null;
  title: string | null;
  industry: string | null;
  needDescription: string | null;
  status: string;
  followUps: { content: string; outcome: string | null }[];
  leadCount: number;
}): AiInsight {
  const identity = [input.company, input.title, input.industry].filter(Boolean).join("，");
  const context = input.needDescription || "当前尚未记录明确需求";
  const latest = input.followUps[0]?.outcome || input.followUps[0]?.content;
  const intent =
    input.status === "high_intent"
      ? "高意向：建议优先安排下一次沟通。"
      : input.leadCount > 1
        ? "存在重复留资信号：建议主动确认当前需求和决策节奏。"
        : "信息有限：建议通过首轮沟通补充预算、场景与决策人信息。";

  return {
    portrait: `${input.name}${identity ? `，${identity}` : ""}。当前客户资料显示：${context}。`,
    needs: input.needDescription ? [input.needDescription] : ["待通过沟通确认具体使用场景"],
    intent,
    basis: [
      `客户状态：${input.status}`,
      `门户留资次数：${input.leadCount}`,
      latest ? `最近沟通：${latest.slice(0, 120)}` : "尚无人工跟进记录",
    ],
    communicationFocus: ["确认客户的具体使用场景和目标", "了解时间计划、预算范围与决策角色"],
    questions: ["您目前最希望解决的具体问题是什么？", "这项需求预计希望在什么时间开始使用？"],
    nextAction: "完成一次需求澄清沟通，并根据结果更新客户状态和下次跟进时间。",
    script: `您好，${input.name}，感谢您关注元川 AI。为了更准确地给您建议，想了解您目前最希望解决的使用场景是什么，以及您期待的上线时间。`,
    isDemo: true,
  };
}

export async function generateAiAnalysis(customerId: string) {
  const customer = db.select().from(customers).where(eq(customers.id, customerId)).get();
  if (!customer) return null;

  const followUpRows = db
    .select({ content: followUps.content, outcome: followUps.outcome })
    .from(followUps)
    .where(eq(followUps.customerId, customerId))
    .orderBy(desc(followUps.followUpAt))
    .all();
  const leadRows = db
    .select({ id: leadEvents.id })
    .from(leadEvents)
    .where(eq(leadEvents.customerId, customerId))
    .all();

  // 在选择实际模型前，使用清晰标注的本地规则建议，避免在未配置密钥时意外传出客户资料。
  const insight = createRuleBasedInsight({
    name: customer.name,
    company: customer.company,
    title: customer.title,
    industry: customer.industry,
    needDescription: customer.needDescription,
    status: customer.status,
    followUps: followUpRows,
    leadCount: leadRows.length,
  });
  const createdAt = nowIso();
  const id = crypto.randomUUID();
  const snapshot = {
    customer: {
      name: customer.name,
      company: customer.company,
      title: customer.title,
      industry: customer.industry,
      needDescription: customer.needDescription,
      status: customer.status,
    },
    followUps: followUpRows,
    leadCount: leadRows.length,
  };

  db.transaction((tx) => {
    tx.insert(aiAnalyses)
      .values({
        id,
        customerId,
        inputSnapshot: JSON.stringify(snapshot),
        outputJson: JSON.stringify(insight),
        modelName: "local-rule-based-placeholder",
        createdAt,
      })
      .run();
    tx.insert(timelineEvents)
      .values({
        id: crypto.randomUUID(),
        customerId,
        type: "ai_analysis_generated",
        title: "生成客户分析与销售建议",
        detail: "当前为未配置模型时的本地规则建议。",
        relatedId: id,
        occurredAt: createdAt,
        createdAt,
      })
      .run();
  });

  return { id, createdAt, modelName: "local-rule-based-placeholder", insight };
}

export function getLatestAiAnalysis(customerId: string) {
  const latest = db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.customerId, customerId))
    .orderBy(desc(aiAnalyses.createdAt))
    .get();
  if (!latest) return null;
  return {
    ...latest,
    insight: JSON.parse(latest.outputJson) as AiInsight,
  };
}
