import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

const validEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/prfolio",
  FRONTEND_URL: "http://localhost:3000",
  BACKEND_URL: "http://localhost:4000",
  GITHUB_CLIENT_ID: "client",
  GITHUB_CLIENT_SECRET: "secret",
  SESSION_SECRET: "12345678901234567890123456789012",
  TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};

describe("environment validation", () => {
  it("accepts a complete configuration", () => {
    expect(loadEnv(validEnv).PORT).toBe(4000);
  });

  it("rejects short session secrets", () => {
    expect(() => loadEnv({ ...validEnv, SESSION_SECRET: "short" })).toThrow("Invalid environment configuration");
  });
});
