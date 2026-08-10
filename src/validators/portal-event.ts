import { z } from "zod";

export const portalLeadEventSchema = z.object({
  eventKey: z.string().trim().min(8).max(200),
  portalLeadId: z.string().trim().max(100).optional().nullable(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().or(z.literal("")).optional(),
  source: z.string().trim().min(1).max(40).default("web"),
  submittedAt: z.string().trim().min(1),
});

export type PortalLeadEvent = z.infer<typeof portalLeadEventSchema>;
