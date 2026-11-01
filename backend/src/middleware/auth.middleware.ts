import crypto from "node:crypto";
import type { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "./error.middleware";
import type { AuthenticatedRequest } from "../types";

export const sessionCookieName = "prfolio_session";
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[sessionCookieName] as string | undefined;
  if (!token) return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.expiresAt <= new Date()) return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
  req.userId = session.userId;
  next();
}
