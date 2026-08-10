import { z } from "zod";

import { CUSTOMER_STATUSES } from "@/lib/constants";

const optionalText = z.string().trim().max(500).optional().nullable();

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "请填写客户姓名。").max(80),
  phone: z.string().trim().min(6, "请填写有效手机号。").max(40),
  email: z.string().trim().email("邮箱格式不正确。").or(z.literal("")).optional(),
  company: optionalText,
  title: optionalText,
  region: optionalText,
  industry: optionalText,
  needDescription: optionalText,
  budgetRange: optionalText,
  status: z.enum(CUSTOMER_STATUSES).default("pending"),
  source: z.string().trim().min(1).max(40).default("manual"),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
});

export const customerPatchSchema = customerInputSchema.partial();

export type CustomerInput = z.infer<typeof customerInputSchema>;
