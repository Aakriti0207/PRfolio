import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env";
import { exchangeCode, getGitHubAuthorizationUrl, getGitHubUser } from "../lib/github";
import { prisma } from "../lib/prisma";
import { createSession, createState, statesEqual, upsertGitHubUser } from "../services/auth.service";
import { oauthCallbackSchema } from "../schemas/validation.schemas";
import { AppError } from "../middleware/error.middleware";
import { sessionCookieName } from "../middleware/auth.middleware";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: env.NODE_ENV === "production", path: "/" };

export function startOAuth(_req: Request, res: Response) {
  const state = createState();
  res.cookie("prfolio_oauth_state", state, { ...cookieOptions, maxAge: 10 * 60 * 1000 });
  res.redirect(getGitHubAuthorizationUrl(state));
}

export async function finishOAuth(req: Request, res: Response) {
  const input = oauthCallbackSchema.parse(req.query);
  const expected = req.cookies?.prfolio_oauth_state as string | undefined;
  if (!expected || expected.length !== input.state.length || !statesEqual(expected, input.state)) throw new AppError(400, "INVALID_OAUTH_STATE", "Invalid OAuth state");
  const token = await exchangeCode(input.code);
  const user = await upsertGitHubUser(await getGitHubUser(token), token);
  const session = await createSession(user.id);
  res.clearCookie("prfolio_oauth_state", cookieOptions);
  res.cookie(sessionCookieName, session, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.redirect(env.FRONTEND_URL);
}

export async function me(req: Request, res: Response) {
  const userId = (req as Request & { userId?: string }).userId;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, githubUsername: true, displayName: true, avatarUrl: true, profileSlug: true } }) : null;
  res.json({ success: true, data: user });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[sessionCookieName] as string | undefined;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: crypto.createHash("sha256").update(token).digest("hex") } });
  res.clearCookie(sessionCookieName, cookieOptions);
  res.json({ success: true, data: null });
}
