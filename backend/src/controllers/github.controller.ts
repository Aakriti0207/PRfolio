import type { Request, Response } from "express";
import { syncContributions, syncPullRequests } from "../services/sync.service";
import { AppError } from "../middleware/error.middleware";

export async function sync(req: Request & { userId?: string }, res: Response) {
  if (!req.userId) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  const prResult = await syncPullRequests(req.userId);
  const contributionResult = await syncContributions(req.userId);
  res.json({ success: true, data: { ...prResult, contributions: contributionResult } });
}
