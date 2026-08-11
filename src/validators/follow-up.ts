import { z } from "zod";

import { CUSTOMER_STATUSES, FOLLOW_UP_CHANNELS } from "@/lib/constants";

export const followUpInputSchema = z.object({
  channel: z.enum(FOLLOW_UP_CHANNELS),
  content: z.string().trim().min(1, "请填写跟进内容。").max(5000),
  outcome: z.string().trim().max(1000).optional().nullable(),
  followUpAt: z.string().trim().min(1),
  nextFollowUpAt: z.string().trim().optional().nullable(),
  statusAfter: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.enum(CUSTOMER_STATUSES).optional().nullable(),
  ),
});

export type FollowUpInput = z.infer<typeof followUpInputSchema>;
