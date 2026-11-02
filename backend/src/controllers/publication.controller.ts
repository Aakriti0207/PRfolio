import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { updatePublicationSchema } from "../schemas/validation.schemas";

export async function updatePublication(req: Request & { userId?: string }, res: Response) {
  if (!req.userId) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  const parsed = updatePublicationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_PUBLICATION", "isPublished must be a boolean", parsed.error.issues);
  }
  const { isPublished } = parsed.data;
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { isPublished },
      select: { isPublished: true, profileSlug: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    throw error;
  }
}
