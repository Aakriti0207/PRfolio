import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/services/crypto.service", () => ({ decrypt: (value: string) => value }));
const { contributionCalendar, gitHubAccount, getGitHubUser, getContributionCalendar } = vi.hoisted(() => ({
  contributionCalendar: { findUnique: vi.fn(), upsert: vi.fn() },
  gitHubAccount: { findUnique: vi.fn() },
  getGitHubUser: vi.fn(),
  getContributionCalendar: vi.fn(),
}));
vi.mock("../src/lib/prisma", () => ({ prisma: { gitHubAccount, contributionCalendar } }));
import { classifyState, syncContributions, timeToMerge } from "../src/services/sync.service";

describe("pull request synchronization helpers", () => {
  beforeEach(() => {
    getContributionCalendar.mockReset();
    getGitHubUser.mockReset();
    contributionCalendar.findUnique.mockReset();
    contributionCalendar.upsert.mockReset();
    gitHubAccount.findUnique.mockReset();
  });

  it("classifies merged pull requests independently of closed state", () => {
    expect(classifyState({ state: "closed", merged_at: "2026-01-02T00:00:00Z" })).toBe("MERGED");
    expect(classifyState({ state: "closed", merged_at: null })).toBe("CLOSED");
    expect(classifyState({ state: "open", merged_at: null })).toBe("OPEN");
  });

  it("calculates time to merge in milliseconds", () => {
    expect(timeToMerge(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T01:00:00Z"))).toBe(3_600_000);
    expect(timeToMerge(new Date("2026-01-01T00:00:00Z"), null)).toBeNull();
  });
});

describe("contribution synchronization", () => {
  beforeEach(() => {
    gitHubAccount.findUnique.mockReset();
    getGitHubUser.mockReset();
    getContributionCalendar.mockReset();
    contributionCalendar.findUnique.mockReset();
    contributionCalendar.upsert.mockReset();
  });

  it("persists the fetched contribution calendar days", async () => {
    gitHubAccount.findUnique.mockResolvedValue({ encryptedToken: "token" });
    getGitHubUser.mockResolvedValue({ login: "contributor" });
    getContributionCalendar.mockResolvedValue([
      { date: "2026-01-01", contributionCount: 2 },
      { date: "2026-01-02", contributionCount: 0 },
    ]);
    contributionCalendar.findUnique.mockResolvedValue(null);
    contributionCalendar.upsert.mockResolvedValue({});

    const result = await syncContributions("user-1");

    expect(getGitHubUser).toHaveBeenCalledWith("token");
    expect(getContributionCalendar).toHaveBeenCalledWith("token", "contributor", expect.any(Date), expect.any(Date));
    expect(contributionCalendar.upsert).toHaveBeenCalledTimes(2);
    expect(result.fetched).toBe(2);
  });

  it("keeps previously stored contributions when the GitHub sync fails", async () => {
    gitHubAccount.findUnique.mockResolvedValue({ encryptedToken: "token" });
    getGitHubUser.mockResolvedValue({ login: "contributor" });
    getContributionCalendar.mockRejectedValue(new Error("GitHub contribution calendar failed: Bad credentials"));

    await expect(syncContributions("user-1")).rejects.toThrow("Bad credentials");
    expect(contributionCalendar.upsert).not.toHaveBeenCalled();
  });
});
