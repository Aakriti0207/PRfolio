import { z } from "zod";

export const oauthCallbackSchema = z.object({ code: z.string().min(1), state: z.string().min(32).max(128) });
export const idSchema = z.object({ id: z.string().min(1) });
export const updatePrSchema = z.object({ featured: z.boolean().optional(), hidden: z.boolean().optional(), displayOrder: z.number().int().min(0).optional() }).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const listPrsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  state: z.enum(["OPEN", "CLOSED", "MERGED"]).optional(),
  repository: z.string().max(200).optional(),
  language: z.string().max(100).optional(),
  featured: z.coerce.boolean().optional(),
  hidden: z.coerce.boolean().optional(),
  sort: z.enum(["createdAtGitHub", "mergedAt", "updatedAtGitHub", "timeToMerge"]).default("createdAtGitHub"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
