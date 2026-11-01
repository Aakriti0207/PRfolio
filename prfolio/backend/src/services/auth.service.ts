import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { encrypt } from "./crypto.service";

export const createState = () => crypto.randomBytes(32).toString("base64url");
export const statesEqual = (expected: string, actual: string) => crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));

export async function upsertGitHubUser(profile: { id: number; login: string; name: string | null; avatar_url: string; bio: string | null; location: string | null; blog: string | null }, token: string) {
  const user = await prisma.user.upsert({
    where: { githubUsername: profile.login },
    update: { displayName: profile.name, avatarUrl: profile.avatar_url, bio: profile.bio, location: profile.location, website: profile.blog || null },
    create: { githubUsername: profile.login, profileSlug: profile.login, displayName: profile.name, avatarUrl: profile.avatar_url, bio: profile.bio, location: profile.location, website: profile.blog || null },
  });
  await prisma.gitHubAccount.upsert({
    where: { userId: user.id },
    update: { githubId: String(profile.id), githubUsername: profile.login, encryptedToken: encrypt(token), tokenCreatedAt: new Date() },
    create: { userId: user.id, githubId: String(profile.id), githubUsername: profile.login, encryptedToken: encrypt(token) },
  });
  return user;
}

export async function createSession(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { userId, tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
  return rawToken;
}
