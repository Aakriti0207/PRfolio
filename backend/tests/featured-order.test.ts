import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { sessionFindUnique, findMany, findFirst, aggregate, update, updateMany, transaction } = vi.hoisted(() => ({
  sessionFindUnique: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  aggregate: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    session: { findUnique: sessionFindUnique },
    pullRequest: { findMany, findFirst, aggregate, update, updateMany },
  },
}));

import { app } from "../src/app";
import { AppError } from "../src/middleware/error.middleware";
import { nextFeaturedOrder, reorderFeatured } from "../src/services/prs.service";

const featuredPr = (id: string, displayOrder: number) => ({ id, displayOrder });

function signedIn(userId = "user-1") {
  sessionFindUnique.mockResolvedValue({ userId, expiresAt: new Date(Date.now() + 60_000) });
}

describe("featured PR reordering service", () => {
  beforeEach(() => {
    [sessionFindUnique, findMany, findFirst, aggregate, update, updateMany, transaction].forEach((mock) => mock.mockReset());
    updateMany.mockImplementation((args: unknown) => Promise.resolve({ args }));
    transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));
  });

  it("assigns sequential positions in the requested order and only writes rows that moved", async () => {
    findMany.mockResolvedValue([featuredPr("a", 0), featuredPr("b", 1), featuredPr("c", 2)]);

    const result = await reorderFeatured("user-1", ["a", "c", "b"]);

    expect(result).toEqual([{ id: "a", displayOrder: 0 }, { id: "c", displayOrder: 1 }, { id: "b", displayOrder: 2 }]);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "c", userId: "user-1", featured: true, hidden: false }, data: { displayOrder: 1 } });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "b", userId: "user-1", featured: true, hidden: false }, data: { displayOrder: 2 } });
  });

  it("normalizes PRs that all share the default displayOrder of 0", async () => {
    findMany.mockResolvedValue([featuredPr("a", 0), featuredPr("b", 0), featuredPr("c", 0)]);

    const result = await reorderFeatured("user-1", ["b", "a", "c"]);

    expect(result).toEqual([{ id: "b", displayOrder: 0 }, { id: "a", displayOrder: 1 }, { id: "c", displayOrder: 2 }]);
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it("only reads the caller's featured, visible PRs", async () => {
    findMany.mockResolvedValue([featuredPr("a", 0)]);

    await reorderFeatured("user-1", ["a"]);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1", featured: true, hidden: false } }));
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects ids that are not the caller's featured PRs and writes nothing", async () => {
    findMany.mockResolvedValue([featuredPr("a", 0), featuredPr("b", 1)]);

    await expect(reorderFeatured("user-1", ["b", "someone-elses-pr", "a"])).rejects.toMatchObject({ status: 404, code: "PR_NOT_FOUND" });
    await expect(reorderFeatured("user-1", ["b", "someone-elses-pr", "a"])).rejects.toBeInstanceOf(AppError);
    expect(transaction).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("keeps featured PRs missing from the request after the listed ones", async () => {
    findMany.mockResolvedValue([featuredPr("a", 0), featuredPr("b", 1), featuredPr("c", 2)]);

    const result = await reorderFeatured("user-1", ["c"]);

    expect(result.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("puts a newly featured PR after the last featured position", async () => {
    aggregate.mockResolvedValue({ _max: { displayOrder: 4 } });
    await expect(nextFeaturedOrder("user-1")).resolves.toBe(5);
    expect(aggregate).toHaveBeenCalledWith({ where: { userId: "user-1", featured: true, hidden: false }, _max: { displayOrder: true } });

    aggregate.mockResolvedValue({ _max: { displayOrder: null } });
    await expect(nextFeaturedOrder("user-1")).resolves.toBe(0);
  });
});

describe("featured order API", () => {
  beforeEach(() => {
    [sessionFindUnique, findMany, findFirst, aggregate, update, updateMany, transaction].forEach((mock) => mock.mockReset());
    updateMany.mockImplementation((args: unknown) => Promise.resolve({ args }));
    transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));
  });

  const put = (body: unknown) => request(app).put("/api/prs/featured/order").set("Cookie", "prfolio_session=token").send(body as object);

  it("requires authentication", async () => {
    const response = await request(app).put("/api/prs/featured/order").send({ ids: ["a"] });
    expect(response.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects untrusted origins", async () => {
    signedIn();
    const response = await put({ ids: ["a"] }).set("Origin", "https://evil.example");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_REJECTED");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("validates the payload", async () => {
    signedIn();
    for (const body of [{}, { ids: [] }, { ids: ["a", "a"] }, { ids: [1] }, { ids: ["a"], extra: true }]) {
      const response = await put(body);
      expect(response.status).toBe(400);
    }
    expect(findMany).not.toHaveBeenCalled();
  });

  it("saves the order for the signed-in user", async () => {
    signedIn("user-7");
    findMany.mockResolvedValue([featuredPr("a", 0), featuredPr("b", 1)]);

    const response = await put({ ids: ["b", "a"] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { items: [{ id: "b", displayOrder: 0 }, { id: "a", displayOrder: 1 }] } });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-7", featured: true, hidden: false } }));
  });

  it("does not let a user reorder another user's PRs", async () => {
    signedIn("user-1");
    findMany.mockResolvedValue([featuredPr("mine", 0)]);

    const response = await put({ ids: ["mine", "victim-pr"] });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PR_NOT_FOUND");
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("featuring a PR", () => {
  beforeEach(() => {
    [sessionFindUnique, findMany, findFirst, aggregate, update, updateMany, transaction].forEach((mock) => mock.mockReset());
    signedIn();
    update.mockImplementation(({ data }: { data: unknown }) => Promise.resolve({ id: "pr-1", ...(data as object) }));
  });

  const patch = (body: unknown) => request(app).patch("/api/prs/pr-1").set("Cookie", "prfolio_session=token").send(body as object);

  it("appends a newly featured PR to the end of the featured order", async () => {
    findFirst.mockResolvedValue({ id: "pr-1", featured: false });
    aggregate.mockResolvedValue({ _max: { displayOrder: 2 } });

    const response = await patch({ featured: true, hidden: false });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "pr-1" }, data: { featured: true, hidden: false, displayOrder: 3 } });
  });

  it("leaves the order alone for PRs that are already featured or are not being featured", async () => {
    findFirst.mockResolvedValue({ id: "pr-1", featured: true });
    await patch({ featured: true, hidden: false });
    expect(update).toHaveBeenLastCalledWith({ where: { id: "pr-1" }, data: { featured: true, hidden: false } });

    findFirst.mockResolvedValue({ id: "pr-1", featured: false });
    await patch({ hidden: true, featured: false });
    expect(update).toHaveBeenLastCalledWith({ where: { id: "pr-1" }, data: { hidden: true, featured: false } });
    expect(aggregate).not.toHaveBeenCalled();
  });

  it("still returns 404 for a PR the user does not own", async () => {
    findFirst.mockResolvedValue(null);
    const response = await patch({ featured: true });
    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});