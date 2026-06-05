import { describe, expect, it } from "vitest";

import { isLatestClarificationRequest } from "./useClarificationFlow";

describe("isLatestClarificationRequest", () => {
  it("accepts only the newest request", () => {
    expect(isLatestClarificationRequest(2, 2)).toBe(true);
    expect(isLatestClarificationRequest(1, 2)).toBe(false);
  });
});
