import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./error.middleware";

export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  if (origin && origin !== env.FRONTEND_URL) return next(new AppError(403, "CSRF_REJECTED", "Request origin is not allowed"));
  next();
}
