import { prisma } from "../lib/prisma";
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
