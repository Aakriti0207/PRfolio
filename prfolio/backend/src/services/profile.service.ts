import { prisma } from "../lib/prisma";

export async function getPublicProfile(slug: string) {
  const user = await prisma.user.findUnique({
    where: { profileSlug: slug },
    select: { githubUsername: true, displayName: true, avatarUrl: true, bio: true, location: true, website: true, contributionGraphVisible: true,
      pullRequests: { where: { hidden: false }, orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAtGitHub: "desc" }], select: { title: true, repositoryFullName: true, state: true, language: true, number: true, htmlUrl: true, createdAtGitHub: true, mergedAt: true, featured: true } },
    },
  });
  if (!user) return null;
  return user;
}
