import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count, transaction } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    pullRequest: { findMany, count, findFirst: vi.fn() },
  },
}));

import { listPrs } from "../src/services/prs.service";

describe("pull request listing", () => {
  beforeEach(() => {
    findMany.mockReset();
    count.mockReset();
    transaction.mockReset();
  });

  it("returns a single page of pull requests", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(24);
    transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));

    const result = await listPrs("user-1", { page: 1, limit: 8, sort: "updatedAtGitHub", order: "desc" });

    expect(result).toEqual({ items: [], page: 1, limit: 8, total: 24, pages: 3 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 8 }));
    expect(count).toHaveBeenCalled();
  });

  it("targets the correct page window for the requested page", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(24);
    transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));

    const result = await listPrs("user-1", { page: 3, limit: 8, sort: "updatedAtGitHub", order: "desc" });

    expect(result.pages).toBe(3);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 16, take: 8 }));
  });

  it("returns an empty page when the requested page is out of range", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));

    const result = await listPrs("user-1", { page: 2, limit: 8, sort: "createdAtGitHub", order: "desc" });

    expect(result).toEqual({ items: [], page: 2, limit: 8, total: 0, pages: 0 });
  });
});
