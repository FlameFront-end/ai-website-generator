import { describe, it, expect } from "vitest";
import { stripTechnicalBriefPrefix } from "./brief-display";

describe("stripTechnicalBriefPrefix", () => {
  it("strips a Target site language block followed by blank line", () => {
    const input = [
      "Target site language: Russian",
      "Generate all user-facing website copy, style option names, style option descriptions, design labels, metadata, and UI labels in Russian.",
      "Keep internal technical instructions in English.",
      "",
      "Создай лендинг для кофейни",
    ].join("\n");

    expect(stripTechnicalBriefPrefix(input)).toBe(
      "Создай лендинг для кофейни",
    );
  });

  it("strips English language block", () => {
    const input = [
      "Target site language: English",
      "Generate all user-facing website copy, style option names, style option descriptions, design labels, metadata, and UI labels in English.",
      "Keep internal technical instructions in English.",
      "",
      "Create a landing page for a coffee shop",
    ].join("\n");

    expect(stripTechnicalBriefPrefix(input)).toBe(
      "Create a landing page for a coffee shop",
    );
  });

  it("returns brief as-is when no technical prefix exists", () => {
    const input = "Just a regular brief text";
    expect(stripTechnicalBriefPrefix(input)).toBe("Just a regular brief text");
  });

  it("handles empty string", () => {
    expect(stripTechnicalBriefPrefix("")).toBe("");
  });

  it("handles leading whitespace before technical block", () => {
    const input = [
      "  Target site language: Russian",
      "",
      "Мой бриф",
    ].join("\n");

    expect(stripTechnicalBriefPrefix(input)).toBe("Мой бриф");
  });
});
