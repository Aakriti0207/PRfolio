import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import type { z } from "zod";
import type { listPrsSchema } from "../schemas/validation.schemas";

type ListParams = z.infer<typeof listPrsSchema>;

export async function listPrs(userId: string, params: ListParams) {
  const where = {
    userId,
    ...(params.state ? { state: params.state } : {}),
    ...(params.repository ? { repositoryFullName: { contains: params.repository, mode: "insensitive" as const } } : {}),
    ...(params.language ? { language: { equals: params.language, mode: "insensitive" as const } } : {}),
    ...(params.featured === undefined ? {} : { featured: params.featured }),
    ...(params.hidden === undefined ? {} : { hidden: params.hidden }),
    ...(params.search ? { OR: [{ title: { contains: params.search, mode: "insensitive" as const } }, { repositoryFullName: { contains: params.search, mode: "insensitive" as const } }, { language: { contains: params.search, mode: "insensitive" as const } }] } : {}),
  };
  const orderBy = params.sort === "timeToMerge" ? [{ mergedAt: params.order }, { createdAtGitHub: "desc" as const }] : [{ [params.sort]: params.order }, { id: "asc" as const }];
  const [items, total] = await prisma.$transaction([
    prisma.pullRequest.findMany({ where, orderBy, skip: (params.page - 1) * params.limit, take: params.limit }),
    prisma.pullRequest.count({ where }),
  ]);
  return { items, page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) };
}

export const getOwnedPr = (userId: string, id: string) => prisma.pullRequest.findFirst({ where: { id, userId } });

// Featured PRs shown on the public profile: featured and not hidden. Ordered by displayOrder,
// the same ordering the public profile query uses.
const publicFeaturedWhere = (userId: string) => ({ userId, featured: true, hidden: false });
const publicFeaturedOrderBy = [{ displayOrder: "asc" as const }, { createdAtGitHub: "desc" as const }, { id: "asc" as const }];

// displayOrder for a PR that is being featured now, so it lands at the end of the featured list.
export async function nextFeaturedOrder(userId: string) {
  const { _max } = await prisma.pullRequest.aggregate({ where: publicFeaturedWhere(userId), _max: { displayOrder: true } });
  return (_max.displayOrder ?? -1) + 1;
}

// Persists a new order for the user's featured PRs. `ids` is the desired order. Every id must be one of
// the caller's own featured PRs, otherwise nothing is written. Featured PRs missing from `ids` (for example
// featured from another tab meanwhile) keep their relative order after the listed ones.
export async function reorderFeatured(userId: string, ids: string[]) {
  const current = await prisma.pullRequest.findMany({ where: publicFeaturedWhere(userId), orderBy: publicFeaturedOrderBy, select: { id: true, displayOrder: true } });
  const owned = new Set(current.map((pr) => pr.id));
  if (ids.some((id) => !owned.has(id))) throw new AppError(404, "PR_NOT_FOUND", "One or more featured pull requests were not found");
  const requested = new Set(ids);
  const finalIds = [...ids, ...current.filter((pr) => !requested.has(pr.id)).map((pr) => pr.id)];
  const previous = new Map(current.map((pr) => [pr.id, pr.displayOrder]));
  const changes = finalIds.flatMap((id, index) => (previous.get(id) === index ? [] : [{ id, displayOrder: index }]));
  if (changes.length > 0) {
    await prisma.$transaction(changes.map((change) => prisma.pullRequest.updateMany({ where: { id: change.id, ...publicFeaturedWhere(userId) }, data: { displayOrder: change.displayOrder } })));
  }
  return finalIds.map((id, index) => ({ id, displayOrder: index }));
}

export async function getStats(userId: string) {
  const [total, featured, hidden, merged, open, closed] = await Promise.all([
    prisma.pullRequest.count({ where: { userId } }),
    prisma.pullRequest.count({ where: { userId, featured: true } }),
    prisma.pullRequest.count({ where: { userId, hidden: true } }),
    prisma.pullRequest.count({ where: { userId, state: "MERGED" } }),
    prisma.pullRequest.count({ where: { userId, state: "OPEN" } }),
    prisma.pullRequest.count({ where: { userId, state: "CLOSED" } }),
  ]);
  return { total, featured, hidden, merged, open, closed };
}