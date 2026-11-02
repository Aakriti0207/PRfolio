import { getAuthoredPullRequests, getContributionCalendar, getGitHubUser, type GitHubContributionDay, type GitHubPullRequestDetails } from "../lib/github";
import { prisma } from "../lib/prisma";
import { decrypt } from "./crypto.service";

export function classifyState(pr: Pick<GitHubPullRequestDetails, "state" | "merged_at">): "MERGED" | "OPEN" | "CLOSED" {
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

export async function syncContributions(userId: string) {
  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account) throw new Error("No connected GitHub account");
  const token = decrypt(account.encryptedToken);
  const githubUser = await getGitHubUser(token);
  const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const to = new Date();
  const contributionDays: GitHubContributionDay[] = await getContributionCalendar(token, githubUser.login, from, to);
  let created = 0;
  let updated = 0;
  for (const day of contributionDays) {
    const existing = await prisma.contributionCalendar.findUnique({ where: { userId_date: { userId, date: day.date } } });
    const data = {
      contributionCount: day.contributionCount,
      syncedAt: new Date(),
    };
    await prisma.contributionCalendar.upsert({
      where: { userId_date: { userId, date: day.date } },
      update: data,
      create: { userId, date: day.date, ...data },
    });
    if (existing) updated += 1;
    else created += 1;
  }
  return { fetched: contributionDays.length, created, updated, syncedAt: new Date() };
}
