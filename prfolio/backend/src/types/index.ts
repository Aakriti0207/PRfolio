import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; details?: unknown } };
