import { prisma } from "../lib/prisma";

export async function getPublicProfile(slug: string) {
  const user = await prisma.user.findFirst({
    where: { profileSlug: { equals: slug, mode: "insensitive" }, isPublished: true },
    select: { githubUsername: true, displayName: true, avatarUrl: true, bio: true, location: true, website: true, contributionGraphVisible: true, pullRequests: { where: { featured: true, hidden: false }, orderBy: [{ displayOrder: "asc" }, { createdAtGitHub: "desc" }], select: { title: true, repositoryFullName: true, state: true, language: true, number: true, htmlUrl: true, createdAtGitHub: true, mergedAt: true, closedAt: true } }, contributionCalendars: { orderBy: { date: "asc" }, select: { date: true, contributionCount: true } } },
  });
  if (!user) return null;
  const { contributionGraphVisible, contributionCalendars, ...profile } = user;
  const contributions = contributionGraphVisible ? contributionCalendars : [];
  return { ...profile, contributionGraphVisible, contributions };
}
