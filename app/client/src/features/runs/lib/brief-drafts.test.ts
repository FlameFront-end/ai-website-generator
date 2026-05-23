// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  createBriefDraftId,
  readBriefDrafts,
  readBriefDraft,
  saveBriefDraft,
  deleteBriefDraft,
} from "./brief-drafts";
import type { BriefDraft } from "./brief-drafts";

const STORAGE_KEY = "new-run-brief-drafts";
const LEGACY_KEY = "new-run-brief-draft";

function makeDraft(overrides: Partial<BriefDraft> = {}): BriefDraft {
  const now = new Date().toISOString();
  return {
    id: "test-id",
    title: null,
    rawBrief: "test brief",
    siteLanguage: "ru",
    finalBrief: null,
    clarification: null,
    answers: [],
    answerMap: {},
    isHistoryExpanded: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("createBriefDraftId", () => {
  it("returns a non-empty string", () => {
    const id = createBriefDraftId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createBriefDraftId()));
    expect(ids.size).toBe(50);
  });
});

describe("readBriefDrafts", () => {
  it("returns empty array when storage is empty", () => {
    expect(readBriefDrafts()).toEqual([]);
  });

  it("reads and normalizes drafts from storage", () => {
    const draft = makeDraft({ id: "d1", rawBrief: "hello" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([draft]));

    const result = readBriefDrafts();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
    expect(result[0].rawBrief).toBe("hello");
  });

  it("sorts drafts by updatedAt descending", () => {
    const older = makeDraft({ id: "d1", updatedAt: "2024-01-01T00:00:00Z" });
    const newer = makeDraft({ id: "d2", updatedAt: "2025-01-01T00:00:00Z" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([older, newer]));

    const result = readBriefDrafts();
    expect(result[0].id).toBe("d2");
    expect(result[1].id).toBe("d1");
  });

  it("migrates a legacy draft and removes legacy key", () => {
    const legacy = { rawBrief: "legacy brief" };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));

    const result = readBriefDrafts();
    expect(result).toHaveLength(1);
    expect(result[0].rawBrief).toBe("legacy brief");
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it("handles corrupted JSON by clearing storage", () => {
    localStorage.setItem(STORAGE_KEY, "not-json!!!");

    const result = readBriefDrafts();
    expect(result).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("readBriefDraft", () => {
  it("returns draft by id", () => {
    const draft = makeDraft({ id: "target" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([draft]));

    expect(readBriefDraft("target")).not.toBeNull();
    expect(readBriefDraft("target")?.id).toBe("target");
  });

  it("returns null for unknown id", () => {
    expect(readBriefDraft("nonexistent")).toBeNull();
  });
});

describe("saveBriefDraft", () => {
  it("saves a new draft and returns normalized version", () => {
    const draft = makeDraft({ id: "new-draft" });
    const result = saveBriefDraft(draft);

    expect(result.id).toBe("new-draft");
    expect(readBriefDrafts()).toHaveLength(1);
  });

  it("updates existing draft by id", () => {
    const draft = makeDraft({ id: "upd", rawBrief: "v1" });
    saveBriefDraft(draft);
    saveBriefDraft(makeDraft({ id: "upd", rawBrief: "v2" }));

    const all = readBriefDrafts();
    expect(all).toHaveLength(1);
    expect(all[0].rawBrief).toBe("v2");
  });

  it("places updated draft at the top", () => {
    saveBriefDraft(makeDraft({ id: "a" }));
    saveBriefDraft(makeDraft({ id: "b" }));
    saveBriefDraft(makeDraft({ id: "a", rawBrief: "updated" }));

    const all = readBriefDrafts();
    expect(all[0].id).toBe("a");
  });
});

describe("deleteBriefDraft", () => {
  it("removes draft by id", () => {
    saveBriefDraft(makeDraft({ id: "to-delete" }));
    saveBriefDraft(makeDraft({ id: "keep" }));

    deleteBriefDraft("to-delete");
    const all = readBriefDrafts();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("keep");
  });

  it("does nothing for unknown id", () => {
    saveBriefDraft(makeDraft({ id: "existing" }));
    deleteBriefDraft("unknown");
    expect(readBriefDrafts()).toHaveLength(1);
  });
});
