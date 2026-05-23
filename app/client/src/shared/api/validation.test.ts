import { describe, it, expect } from "vitest";
import {
  isUser,
  isStyleVariant,
  isStyleVariantsResponse,
  isClarifyBriefResponse,
  isRunArtifact,
  isRun,
  parseJsonSafe,
} from "./validation";

describe("isUser", () => {
  it("accepts valid user", () => {
    expect(isUser({ id: "1", email: "a@b.com", avatarUrl: null })).toBe(true);
  });

  it("rejects missing id", () => {
    expect(isUser({ email: "a@b.com" })).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isUser("string")).toBe(false);
    expect(isUser(null)).toBe(false);
    expect(isUser(undefined)).toBe(false);
  });
});

describe("isStyleVariant", () => {
  it("accepts valid variant", () => {
    expect(
      isStyleVariant({
        id: "v1",
        name: "Modern",
        description: "desc",
        visualStyle: "modern",
        colorPalette: ["#000", "#fff"],
        typographyStyle: "sans",
        layoutStyle: "grid",
        moodKeywords: ["clean"],
      }),
    ).toBe(true);
  });

  it("rejects missing colorPalette", () => {
    expect(isStyleVariant({ id: "v1", name: "X" })).toBe(false);
  });

  it("rejects non-array colorPalette", () => {
    expect(
      isStyleVariant({ id: "v1", name: "X", colorPalette: "not-array" }),
    ).toBe(false);
  });
});

describe("isStyleVariantsResponse", () => {
  it("accepts valid response with variants", () => {
    expect(
      isStyleVariantsResponse({
        variants: [
          { id: "v1", name: "A", colorPalette: ["#000"] },
          { id: "v2", name: "B", colorPalette: ["#fff"] },
        ],
      }),
    ).toBe(true);
  });

  it("rejects when variants is not array", () => {
    expect(isStyleVariantsResponse({ variants: "bad" })).toBe(false);
  });

  it("rejects when a variant is invalid", () => {
    expect(
      isStyleVariantsResponse({
        variants: [{ id: "v1" }],
      }),
    ).toBe(false);
  });
});

describe("isClarifyBriefResponse", () => {
  it("accepts valid needs_clarification response", () => {
    expect(
      isClarifyBriefResponse({
        status: "needs_clarification",
        confidence: 0.5,
        missingFields: [],
        questions: [{ id: "q1", type: "text", question: "?", required: true }],
        finalBrief: null,
      }),
    ).toBe(true);
  });

  it("accepts valid ready response", () => {
    expect(
      isClarifyBriefResponse({
        status: "ready",
        confidence: 1,
        missingFields: [],
        questions: [],
        finalBrief: "Final brief text",
      }),
    ).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(
      isClarifyBriefResponse({ status: "unknown", questions: [] }),
    ).toBe(false);
  });
});

describe("isRunArtifact", () => {
  it("accepts valid artifact", () => {
    expect(
      isRunArtifact({ id: "a1", type: "screenshot", path: "/img.png" }),
    ).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(isRunArtifact({ id: "a1" })).toBe(false);
  });
});

describe("isRun", () => {
  const validRun = {
    id: "r1",
    slug: "run-1",
    displayName: null,
    isPinned: false,
    brief: "text",
    status: "running",
    currentStep: null,
    score: null,
    errorMessage: null,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    artifacts: [],
    logs: [],
  };

  it("accepts valid run", () => {
    expect(isRun(validRun)).toBe(true);
  });

  it("rejects missing artifacts array", () => {
    expect(isRun({ ...validRun, artifacts: "bad" })).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isRun(null)).toBe(false);
  });
});

describe("parseJsonSafe", () => {
  it("parses valid JSON and validates with guard", () => {
    const result = parseJsonSafe('{"id":"1","email":"a@b.com"}', isUser);
    expect(result).toEqual({ id: "1", email: "a@b.com" });
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonSafe("not-json", isUser)).toBeNull();
  });

  it("returns null when guard rejects valid JSON", () => {
    expect(parseJsonSafe('{"name":"test"}', isUser)).toBeNull();
  });
});
