import "server-only";

import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

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

type AnalysisInput = {
  name: string;
  company: string | null;
  title: string | null;
  industry: string | null;
  needDescription: string | null;
  status: string;
  followUps: { content: string; outcome: string | null }[];
  leadCount: number;
};

type AiConfiguration = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const insightListSchema = z.preprocess(
  (value) => typeof value === "string" ? [value] : value,
  z.array(z.string().trim().min(1).max(500)).min(1).max(8),
);

const providerInsightSchema = z.object({
  portrait: z.string().trim().min(1).max(2000),
  needs: insightListSchema,
  intent: z.string().trim().min(1).max(1000),
  basis: insightListSchema,
  communicationFocus: insightListSchema,
  questions: insightListSchema,
  nextAction: z.string().trim().min(1).max(1000),
  script: z.string().trim().min(1).max(3000),
});

export class AiProviderError extends Error {}

function getAiConfiguration(): AiConfiguration | null {
  const baseUrl = process.env.AI_API_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  if (!baseUrl && !apiKey && !model) return null;
  if (!baseUrl || !apiKey || !model) {
    throw new AiProviderError("AI 服务配置不完整，请检查 AI_API_BASE_URL、AI_API_KEY 与 AI_MODEL。");
  }
  return { baseUrl, apiKey, model };
}

function createRuleBasedInsight(input: AnalysisInput): AiInsight {
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

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? content.trim();
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1)) as unknown;
    throw new AiProviderError("AI 服务没有返回可解析的结构化建议。");
  }
}

async function createProviderInsight(input: AnalysisInput, config: AiConfiguration): Promise<AiInsight> {
  const instruction = [
    "You are a B2B sales assistant. Use only the supplied customer profile and follow-up history. State unknown information as items to confirm; never invent facts.",
    "Return one valid JSON object only, with no Markdown or explanation. It must contain portrait, needs, intent, basis, communicationFocus, questions, nextAction, and script. needs, basis, communicationFocus, and questions must be arrays of strings; all other fields must be strings.",
    "Write all values in Simplified Chinese. Keep recommendations practical, and never make a price, contract, or delivery commitment for the sales user.",
  ].join("\n");
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      messages: [{ role: "user", content: `${instruction}\n\nCustomer data:\n${JSON.stringify(input)}` }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new AiProviderError(`AI 服务暂时不可用（HTTP ${response.status}）。`);
  }

  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new AiProviderError("AI 服务未返回有效建议内容。");
  }
  const parsed = providerInsightSchema.safeParse(extractJson(content));
  if (!parsed.success) {
    throw new AiProviderError("AI 服务返回的建议格式不符合要求，请稍后重试。");
  }
  return { ...parsed.data, isDemo: false };
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

  const input: AnalysisInput = {
    name: customer.name,
    company: customer.company,
    title: customer.title,
    industry: customer.industry,
    needDescription: customer.needDescription,
    status: customer.status,
    followUps: followUpRows,
    leadCount: leadRows.length,
  };
  const config = getAiConfiguration();
  const insight = config ? await createProviderInsight(input, config) : createRuleBasedInsight(input);
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
  const modelName = config?.model ?? "local-rule-based-placeholder";

  db.transaction((tx) => {
    tx.insert(aiAnalyses)
      .values({
        id,
        customerId,
        inputSnapshot: JSON.stringify(snapshot),
        outputJson: JSON.stringify(insight),
        modelName,
        createdAt,
      })
      .run();
    tx.insert(timelineEvents)
      .values({
        id: crypto.randomUUID(),
        customerId,
        type: "ai_analysis_generated",
        title: "生成客户分析与销售建议",
        detail: insight.isDemo ? "当前为未配置模型时的本地规则建议。" : `使用 ${modelName} 生成 AI 销售建议。`,
        relatedId: id,
        occurredAt: createdAt,
        createdAt,
      })
      .run();
  });

  return { id, createdAt, modelName, insight };
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
