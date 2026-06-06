import { describe, expect, it } from "vitest";

import {
  isLatestClarificationRequest,
  toClarifyBriefAnswersPayload,
} from "./useClarificationFlow";

describe("isLatestClarificationRequest", () => {
  it("accepts only the newest request", () => {
    expect(isLatestClarificationRequest(2, 2)).toBe(true);
    expect(isLatestClarificationRequest(1, 2)).toBe(false);
  });
});

describe("toClarifyBriefAnswersPayload", () => {
  it("keeps only fields accepted by the server DTO", () => {
    expect(
      toClarifyBriefAnswersPayload([
        {
          questionId: "q1",
          question: "What do you need?",
          type: "text",
          description: "extra",
          required: true,
          options: ["a"],
          placeholder: "answer",
          suggestedAnswer: "Landing page",
          min: 1,
          max: 5,
          value: "Landing page",
          skipped: false,
        },
      ]),
    ).toEqual([
      {
        questionId: "q1",
        question: "What do you need?",
        value: "Landing page",
        skipped: false,
      },
    ]);
  });
});
