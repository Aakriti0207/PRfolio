import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.issues } });
    return;
  }
  const appError = error instanceof AppError ? error : undefined;
  if (!appError) console.error(error);
  res.status(appError?.status ?? 500).json({
    success: false,
    error: { code: appError?.code ?? "INTERNAL_ERROR", message: appError?.message ?? "Internal server error", ...(appError?.details ? { details: appError.details } : {}) },
  });
};
