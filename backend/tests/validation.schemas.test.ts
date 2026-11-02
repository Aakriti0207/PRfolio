import { describe, expect, it } from "vitest";
import { updatePrSchema, updatePublicationSchema } from "../src/schemas/validation.schemas";

describe("PR update validation", () => {
  it("rejects unsupported fields", () => {
    expect(() => updatePrSchema.parse({ featured: true, userId: "other-user" })).toThrow();
  });

  it("accepts only supported portfolio fields", () => {
    expect(updatePrSchema.parse({ featured: true, hidden: false, displayOrder: 2 })).toEqual({ featured: true, hidden: false, displayOrder: 2 });
  });
});

describe("Publication update validation", () => {
  it("accepts valid boolean isPublished", () => {
    expect(updatePublicationSchema.parse({ isPublished: true })).toEqual({ isPublished: true });
    expect(updatePublicationSchema.parse({ isPublished: false })).toEqual({ isPublished: false });
  });

  it("rejects non-boolean isPublished or missing fields", () => {
    expect(() => updatePublicationSchema.parse({ isPublished: "true" })).toThrow();
    expect(() => updatePublicationSchema.parse({})).toThrow();
    expect(() => updatePublicationSchema.parse({ isPublished: true, extra: 123 })).toThrow();
  });
});
