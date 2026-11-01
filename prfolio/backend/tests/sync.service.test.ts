import { describe, expect, it, vi } from "vitest";
vi.mock("../src/services/crypto.service", () => ({ decrypt: (value: string) => value }));
vi.mock("../src/lib/github", () => ({ getAuthoredPullRequests: vi.fn() }));
import { classifyState, timeToMerge } from "../src/services/sync.service";

describe("pull request synchronization helpers", () => {
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
