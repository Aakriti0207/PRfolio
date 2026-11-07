import { prisma } from "../lib/prisma";
import { syncContributions } from "./sync.service";

// The heatmap is refreshed lazily: a public profile view older than this triggers a background GitHub sync
// of the contribution calendar, so the graph keeps up without a manual Sync or a cron job.
export const CONTRIBUTION_REFRESH_MS = 60 * 60 * 1000;
const refreshing = new Set<string>();
// After a failed attempt (e.g. GitHub rate limit) wait before trying again so profile views never hammer the API.
const RETRY_AFTER_FAILURE_MS = 15 * 60 * 1000;
const lastFailure = new Map<string, number>();

function refreshContributionsIfStale(userId: string, latestSyncedAt: Date | null, now = Date.now()) {
  if (latestSyncedAt && now - latestSyncedAt.getTime() < CONTRIBUTION_REFRESH_MS) return;
  if (refreshing.has(userId)) return;
  if (now - (lastFailure.get(userId) ?? 0) < RETRY_AFTER_FAILURE_MS) return;
  refreshing.add(userId);
  void syncContributions(userId)
    .then(() => lastFailure.delete(userId))
    .catch(() => lastFailure.set(userId, Date.now()))
    .finally(() => refreshing.delete(userId));
}

export async function getPublicProfile(slug: string) {
  const user = await prisma.user.findFirst({
    where: { profileSlug: { equals: slug, mode: "insensitive" }, isPublished: true },
    select: { id: true, githubUsername: true, displayName: true, avatarUrl: true, bio: true, location: true, website: true, contributionGraphVisible: true, pullRequests: { where: { featured: true, hidden: false }, orderBy: [{ displayOrder: "asc" }, { createdAtGitHub: "desc" }], select: { title: true, repositoryFullName: true, state: true, language: true, number: true, htmlUrl: true, createdAtGitHub: true, mergedAt: true, closedAt: true } }, contributionCalendars: { orderBy: { date: "asc" }, select: { date: true, contributionCount: true, syncedAt: true } } },
  });
  if (!user) return null;
  const { id, contributionGraphVisible, contributionCalendars, ...profile } = user;
  if (contributionGraphVisible) {
    const latest = contributionCalendars.reduce<Date | null>((max, day) => (!max || day.syncedAt > max ? day.syncedAt : max), null);
    refreshContributionsIfStale(id, latest);
  }
  const contributions = contributionGraphVisible ? contributionCalendars.map(({ date, contributionCount }) => ({ date, contributionCount })) : [];
  return { ...profile, contributionGraphVisible, contributions };
}
