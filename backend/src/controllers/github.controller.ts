import type { Request, Response } from "express";
import { syncPullRequests } from "../services/sync.service";
import { AppError } from "../middleware/error.middleware";

export async function sync(req: Request & { userId?: string }, res: Response) {
  if (!req.userId) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  res.json({ success: true, data: await syncPullRequests(req.userId) });
}
