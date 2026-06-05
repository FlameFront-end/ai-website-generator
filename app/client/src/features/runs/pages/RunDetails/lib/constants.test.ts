import { describe, it, expect } from "vitest";
import { isTabAvailable } from "./constants";

describe("isTabAvailable", () => {
  it("overview is always available", () => {
    expect(isTabAvailable("overview", "running", "queued")).toBe(true);
  });

  it("artifacts is always available", () => {
    expect(isTabAvailable("artifacts", "running", "queued")).toBe(true);
  });

  it("logs is always available", () => {
    expect(isTabAvailable("logs", "running", "queued")).toBe(true);
  });

  it("style tab is unavailable before generate_style_variants", () => {
    expect(isTabAvailable("style", "running", "prepare_brief")).toBe(false);
  });

  it("style tab is available at generate_style_variants", () => {
    expect(isTabAvailable("style", "running", "generate_style_variants")).toBe(
      true,
    );
  });

  it("reference tab is available at prepare_reference_image", () => {
    expect(
      isTabAvailable("reference", "running", "prepare_reference_image"),
    ).toBe(true);
  });

  it("reference tab is unavailable before prepare_reference_image", () => {
    expect(
      isTabAvailable("reference", "running", "awaiting_style_selection"),
    ).toBe(false);
  });

  it("code tab is available once build starts", () => {
    expect(isTabAvailable("code", "running", "build_project")).toBe(true);
  });

  it("code tab is unavailable before build starts", () => {
    expect(isTabAvailable("code", "running", "prepare_frontend_project")).toBe(
      false,
    );
  });

  it("result tab is available at screenshots_ready", () => {
    expect(isTabAvailable("result", "running", "screenshots_ready")).toBe(true);
  });

  it("result tab is unavailable before screenshots_ready", () => {
    expect(isTabAvailable("result", "running", "build_project")).toBe(false);
  });

  it("uses currentStep for failed status", () => {
    expect(isTabAvailable("code", "failed", "build_project")).toBe(true);
    expect(isTabAvailable("code", "failed", "queued")).toBe(false);
  });

  it("falls back to status as step when currentStep is undefined", () => {
    expect(isTabAvailable("style", "completed", undefined)).toBe(true);
  });
});
