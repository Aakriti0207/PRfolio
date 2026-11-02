import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthoredPullRequests, getContributionCalendar, normalizePullRequest, type GitHubPullRequestDetails, type GitHubRepository } from "../src/lib/github";

const repository: GitHubRepository = {
  name: "project",
  full_name: "owner/project",
  html_url: "https://github.com/owner/project",
  owner: { login: "owner" },
  language: "TypeScript",
};

const pullRequest: GitHubPullRequestDetails = {
  id: 42,
  number: 7,
  title: "Improve API",
  body: null,
  html_url: "https://github.com/owner/project/pull/7",
  state: "closed",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  closed_at: "2026-01-02T00:00:00Z",
  merged_at: "2026-01-02T00:00:00Z",
  user: { login: "contributor" },
  repository_url: "https://api.github.com/repos/owner/project",
  base: { repo: repository },
};

describe("GitHub pull request normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves authoritative merge metadata and repository language", () => {
    const result = normalizePullRequest(pullRequest, repository, "contributor");
    expect(result?.merged_at).toBe("2026-01-02T00:00:00Z");
    expect(result?.repository.language).toBe("TypeScript");
  });

  it("rejects pull requests not authored by the authenticated user", () => {
    expect(normalizePullRequest(pullRequest, repository, "someone-else")).toBeNull();
  });

  it("discovers authored merged pull requests with a space-separated query", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        id: 1,
        login: "contributor",
        name: "Contributor",
        avatar_url: "https://avatars.example.test/1",
        bio: null,
        location: null,
        blog: null,
      }))
      .mockResolvedValueOnce(Response.json({
        total_count: 1,
        incomplete_results: false,
        items: [pullRequest],
      }))
      .mockResolvedValueOnce(Response.json(repository))
      .mockResolvedValueOnce(Response.json(pullRequest));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAuthoredPullRequests("test-token");
    const searchUrl = new URL(fetchMock.mock.calls[1][0] as string);

    expect(searchUrl.searchParams.get("q")).toBe("is:pr author:contributor");
    expect(result).toHaveLength(1);
    expect(result[0].merged_at).toBe("2026-01-02T00:00:00Z");
  });

  it("fails when GitHub marks discovery results as incomplete", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        id: 1,
        login: "contributor",
        name: "Contributor",
        avatar_url: "https://avatars.example.test/1",
        bio: null,
        location: null,
        blog: null,
      }))
      .mockResolvedValueOnce(Response.json({
        total_count: 1,
        incomplete_results: true,
        items: [],
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAuthoredPullRequests("test-token")).rejects.toThrow("incomplete");
  });
});

describe("GitHub contribution calendar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches contribution days for the requested range through the GraphQL contribution calendar", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({
      data: { user: { contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: [{ date: "2026-01-01T00:00:00Z", contributionCount: 2 }, { date: "2026-01-02T00:00:00Z", contributionCount: 0 }] }] } } } },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const days = await getContributionCalendar("test-token", "contributor", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-02T00:00:00Z"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/graphql");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.query).toContain("contributionsCollection");
    expect(body.variables.login).toBe("contributor");
    expect(days).toEqual([
      { date: "2026-01-01", contributionCount: 2 },
      { date: "2026-01-02", contributionCount: 0 },
    ]);
  });

  it("handles GraphQL contribution calendar errors", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ errors: [{ message: "Bad credentials" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getContributionCalendar("test-token", "contributor", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-02T00:00:00Z"))).rejects.toThrow("Bad credentials");
  });
});
