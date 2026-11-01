import type { Request, Response } from "express";
import { idSchema, listPrsSchema, updatePrSchema } from "../schemas/validation.schemas";
import { getOwnedPr, getStats, listPrs } from "../services/prs.service";
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
  if (!await getOwnedPr(ownerId, id)) throw new AppError(404, "PR_NOT_FOUND", "Pull request not found");
  const pr = await prisma.pullRequest.update({ where: { id }, data: updatePrSchema.parse(req.body) });
  res.json({ success: true, data: pr });
}
export async function stats(req: Request & { userId?: string }, res: Response) { res.json({ success: true, data: await getStats(userId(req)) }); }
