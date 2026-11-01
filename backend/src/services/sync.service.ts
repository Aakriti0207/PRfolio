import { getAuthoredPullRequests } from "../lib/github";
import { prisma } from "../lib/prisma";
import { decrypt } from "./crypto.service";

export function classifyState(pr: { state: "open" | "closed"; merged_at: string | null }): "MERGED" | "OPEN" | "CLOSED" {
  if (pr.merged_at) return "MERGED";
  return pr.state === "open" ? "OPEN" : "CLOSED";
}

export function timeToMerge(createdAt: Date, mergedAt: Date | null): number | null {
  return mergedAt ? Math.max(0, mergedAt.getTime() - createdAt.getTime()) : null;
}

export async function syncPullRequests(userId: string) {
  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account) throw new Error("No connected GitHub account");
  const githubPrs = await getAuthoredPullRequests(decrypt(account.encryptedToken));
  let created = 0;
  let updated = 0;
  for (const pr of githubPrs) {
    if (!pr.repository) continue;
    const data = {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      htmlUrl: pr.html_url,
      repositoryName: pr.repository.name,
      repositoryFullName: pr.repository.full_name,
      repositoryUrl: pr.repository.html_url,
      ownerName: pr.repository.owner.login,
      language: pr.repository.language,
      state: classifyState(pr),
      createdAtGitHub: new Date(pr.created_at),
      updatedAtGitHub: new Date(pr.updated_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      lastSyncedAt: new Date(),
    };
    const existing = await prisma.pullRequest.findUnique({ where: { userId_githubId: { userId, githubId: String(pr.id) } } });
    await prisma.pullRequest.upsert({
      where: { userId_githubId: { userId, githubId: String(pr.id) } },
      update: data,
      create: { userId, githubId: String(pr.id), ...data },
    });
    if (existing) updated += 1;
    else created += 1;
  }
  return { fetched: githubPrs.length, created, updated, complete: true };
}
