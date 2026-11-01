import type { Request, Response } from "express";
import { AppError } from "../middleware/error.middleware";
import { getPublicProfile } from "../services/profile.service";

export async function profile(req: Request, res: Response) {
  const slug = typeof req.params.slug === "string" ? req.params.slug : req.params.slug[0];
  const result = await getPublicProfile(slug);
  if (!result) throw new AppError(404, "PROFILE_NOT_FOUND", "Public profile not found");
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ success: true, data: result });
}
