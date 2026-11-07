import type { Request, Response } from "express";
import { syncContributions, syncPullRequests } from "../services/sync.service";
import { AppError } from "../middleware/error.middleware";

export async function sync(req: Request & { userId?: string }, res: Response) {
  if (!req.userId) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  try {
    const prResult = await syncPullRequests(req.userId);
    const contributionResult = await syncContributions(req.userId);
    res.json({ success: true, data: { ...prResult, contributions: contributionResult } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Surface the real GitHub/DB failure instead of a blank "Internal server error" so it can be acted on.
    console.error("[sync] failed", error);
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new AppError(502, "GITHUB_SYNC_FAILED", `GitHub sync failed: ${reason}`);
  }
}