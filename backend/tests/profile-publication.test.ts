import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { userUpdate, userFindFirst, sessionFindUnique } = vi.hoisted(() => ({
  userUpdate: vi.fn(),
  userFindFirst: vi.fn(),
  sessionFindUnique: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    user: {
      update: userUpdate,
      findFirst: userFindFirst,
    },
    session: {
      findUnique: sessionFindUnique,
    },
  },
}));

import { app } from "../src/app";
import { updatePublication } from "../src/controllers/publication.controller";
import { getPublicProfile } from "../src/services/profile.service";
import { AppError } from "../src/middleware/error.middleware";

describe("public profile publication controller", () => {
  beforeEach(() => {
    userUpdate.mockReset();
    userFindFirst.mockReset();
    sessionFindUnique.mockReset();
  });

  it("publishes the authenticated user", async () => {
    userUpdate.mockResolvedValue({ isPublished: true, profileSlug: "Aakriti0207" });
    const response = { json: vi.fn() };

    await updatePublication(
      { userId: "user-1", body: { isPublished: true } } as never,
      response as never,
    );

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isPublished: true },
      select: { isPublished: true, profileSlug: true },
    });
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: { isPublished: true, profileSlug: "Aakriti0207" },
    });
  });

  it("unpublishes the authenticated user", async () => {
    userUpdate.mockResolvedValue({ isPublished: false, profileSlug: "Aakriti0207" });
    const response = { json: vi.fn() };

    await updatePublication(
      { userId: "user-1", body: { isPublished: false } } as never,
      response as never,
    );

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isPublished: false },
      select: { isPublished: true, profileSlug: true },
    });
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: { isPublished: false, profileSlug: "Aakriti0207" },
    });
  });

  it("rejects unauthenticated requests", async () => {
    await expect(
      updatePublication({ body: { isPublished: true } } as never, { json: vi.fn() } as never),
    ).rejects.toThrowError(AppError);
  });

  it("rejects invalid publication payloads", async () => {
    await expect(
      updatePublication({ userId: "user-1", body: { isPublished: "yes" } } as never, { json: vi.fn() } as never),
    ).rejects.toThrowError(AppError);

    await expect(
      updatePublication({ userId: "user-1", body: {} } as never, { json: vi.fn() } as never),
    ).rejects.toThrowError(AppError);
  });

  it("handles record not found error from Prisma", async () => {
    userUpdate.mockRejectedValue({ code: "P2025" });
    await expect(
      updatePublication({ userId: "user-1", body: { isPublished: true } } as never, { json: vi.fn() } as never),
    ).rejects.toThrowError(AppError);
  });
});

describe("profile service", () => {
  beforeEach(() => {
    userFindFirst.mockReset();
  });

  it("reads only a published profile and featured visible contributions", async () => {
    userFindFirst.mockResolvedValue({
      githubUsername: "Aakriti0207",
      profileSlug: "Aakriti0207",
      pullRequests: [],
    });

    const result = await getPublicProfile("aakriti0207");

    expect(userFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        profileSlug: { equals: "aakriti0207", mode: "insensitive" },
        isPublished: true,
      },
      select: expect.objectContaining({
        pullRequests: expect.objectContaining({
          where: { featured: true, hidden: false },
        }),
      }),
    }));
    expect(result).not.toBeNull();
  });

  it("returns null if profile is unpublished or does not exist", async () => {
    userFindFirst.mockResolvedValue(null);

    const result = await getPublicProfile("unpublished-user");
    expect(result).toBeNull();
  });

  it("returns stored contribution days for a published profile", async () => {
    userFindFirst.mockResolvedValue({
      githubUsername: "Aakriti0207",
      profileSlug: "Aakriti0207",
      contributionGraphVisible: true,
      pullRequests: [],
      contributionCalendars: [{ date: "2026-01-01T00:00:00Z", contributionCount: 2 }],
    });

    const result = await getPublicProfile("Aakriti0207");

    expect(result?.contributions).toEqual([{ date: "2026-01-01T00:00:00Z", contributionCount: 2 }]);
  });

  it("returns no contribution days when the graph is hidden by the profile owner", async () => {
    userFindFirst.mockResolvedValue({
      githubUsername: "Aakriti0207",
      profileSlug: "Aakriti0207",
      contributionGraphVisible: false,
      pullRequests: [],
      contributionCalendars: [{ date: "2026-01-01T00:00:00Z", contributionCount: 2 }],
    });

    const result = await getPublicProfile("Aakriti0207");

    expect(result?.contributions).toEqual([]);
  });
});

describe("publication route integration", () => {
  beforeEach(() => {
    userUpdate.mockReset();
    userFindFirst.mockReset();
    sessionFindUnique.mockReset();
  });

  it("returns 401 when no session cookie is provided", async () => {
    const res = await request(app)
      .patch("/api/profile/publication")
      .send({ isPublished: true });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when CSRF origin check fails", async () => {
    sessionFindUnique.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() + 100000),
    });

    const res = await request(app)
      .patch("/api/profile/publication")
      .set("Cookie", "prfolio_session=validtoken")
      .set("Origin", "http://malicious-site.com")
      .send({ isPublished: true });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CSRF_REJECTED");
  });

  it("returns 200 and updates publication when authenticated and valid", async () => {
    sessionFindUnique.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() + 100000),
    });
    userUpdate.mockResolvedValue({
      isPublished: true,
      profileSlug: "Aakriti0207",
    });

    const res = await request(app)
      .patch("/api/profile/publication")
      .set("Cookie", "prfolio_session=validtoken")
      .set("Origin", "http://localhost:3000")
      .send({ isPublished: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      isPublished: true,
      profileSlug: "Aakriti0207",
    });
  });
});
