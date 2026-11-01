import { describe, expect, it } from "vitest";
import { updatePrSchema } from "../src/schemas/validation.schemas";

describe("PR update validation", () => {
  it("rejects unsupported fields", () => {
    expect(() => updatePrSchema.parse({ featured: true, userId: "other-user" })).toThrow();
  });

  it("accepts only supported portfolio fields", () => {
    expect(updatePrSchema.parse({ featured: true, hidden: false, displayOrder: 2 })).toEqual({ featured: true, hidden: false, displayOrder: 2 });
  });
});
