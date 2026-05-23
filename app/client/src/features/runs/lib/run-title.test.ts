import { describe, it, expect } from "vitest";
import { formatRunTitle, getRunTitle } from "./run-title";

describe("formatRunTitle", () => {
  it("converts slug pattern 'run-NNN' to 'Проект NNN'", () => {
    expect(formatRunTitle("run-1")).toBe("Проект 1");
    expect(formatRunTitle("run-42")).toBe("Проект 42");
    expect(formatRunTitle("run-100")).toBe("Проект 100");
  });

  it("returns slug as-is when it does not match the pattern", () => {
    expect(formatRunTitle("my-project")).toBe("my-project");
    expect(formatRunTitle("run-")).toBe("run-");
    expect(formatRunTitle("run-abc")).toBe("run-abc");
    expect(formatRunTitle("")).toBe("");
  });
});

describe("getRunTitle", () => {
  it("returns displayName when present", () => {
    expect(getRunTitle({ slug: "run-1", displayName: "My Site" })).toBe(
      "My Site",
    );
  });

  it("falls back to formatted slug when displayName is empty", () => {
    expect(getRunTitle({ slug: "run-5", displayName: "" })).toBe("Проект 5");
  });

  it("falls back to formatted slug when displayName is not provided", () => {
    expect(getRunTitle({ slug: "run-7", displayName: "" })).toBe("Проект 7");
  });
});
