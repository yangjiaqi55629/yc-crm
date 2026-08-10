export const CUSTOMER_STATUSES = [
  "pending",
  "following",
  "high_intent",
  "converted",
  "lost",
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const STATUS_META: Record<CustomerStatus, { label: string; tone: string }> = {
  pending: { label: "待跟进", tone: "slate" },
  following: { label: "跟进中", tone: "blue" },
  high_intent: { label: "高意向", tone: "amber" },
  converted: { label: "已转化", tone: "emerald" },
  lost: { label: "无效/流失", tone: "rose" },
};

export const FOLLOW_UP_CHANNELS = ["电话", "微信", "邮件", "面谈", "其他"] as const;
