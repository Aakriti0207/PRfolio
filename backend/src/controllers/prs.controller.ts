import type { Request, Response } from "express";
import { idSchema, listPrsSchema, reorderFeaturedSchema, updatePrSchema } from "../schemas/validation.schemas";
import { getOwnedPr, getStats, listPrs, nextFeaturedOrder, reorderFeatured } from "../services/prs.service";
import { AppError } from "../middleware/error.middleware";
import { prisma } from "../lib/prisma";

function userId(req: Request & { userId?: string }) { if (!req.userId) throw new AppError(401, "UNAUTHENTICATED", "Authentication required"); return req.userId; }
export async function list(req: Request & { userId?: string }, res: Response) { res.json({ success: true, data: await listPrs(userId(req), listPrsSchema.parse(req.query)) }); }
export async function getOne(req: Request & { userId?: string }, res: Response) {
  const pr = await getOwnedPr(userId(req), idSchema.parse(req.params).id);
  if (!pr) throw new AppError(404, "PR_NOT_FOUND", "Pull request not found");
  res.json({ success: true, data: pr });
}
export async function update(req: Request & { userId?: string }, res: Response) {
  const ownerId = userId(req);
  const id = idSchema.parse(req.params).id;
  const existing = await getOwnedPr(ownerId, id);
  if (!existing) throw new AppError(404, "PR_NOT_FOUND", "Pull request not found");
  const data = updatePrSchema.parse(req.body);
  // A PR that becomes featured is added at the end of the user's featured order.
  if (data.featured === true && !existing.featured && data.displayOrder === undefined) data.displayOrder = await nextFeaturedOrder(ownerId);
  const pr = await prisma.pullRequest.update({ where: { id }, data });
  res.json({ success: true, data: pr });
}
export async function reorderFeaturedOrder(req: Request & { userId?: string }, res: Response) {
  const items = await reorderFeatured(userId(req), reorderFeaturedSchema.parse(req.body).ids);
  res.json({ success: true, data: { items } });
}
export async function stats(req: Request & { userId?: string }, res: Response) { res.json({ success: true, data: await getStats(userId(req)) }); }