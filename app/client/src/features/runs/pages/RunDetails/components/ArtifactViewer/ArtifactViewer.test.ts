import { describe, expect, it } from "vitest";

import { resolveArtifactFileQueryId } from "./artifact-viewer-helpers";

describe("resolveArtifactFileQueryId", () => {
  it("does not load files while the artifact row is closed", () => {
    expect(resolveArtifactFileQueryId(false, false, "artifact-1")).toBe(
      undefined,
    );
  });

  it("does not load text files through the blob endpoint", () => {
    expect(resolveArtifactFileQueryId(true, true, "artifact-1")).toBe(
      undefined,
    );
  });

  it("loads image and binary files only when expanded", () => {
    expect(resolveArtifactFileQueryId(true, false, "artifact-1")).toBe(
      "artifact-1",
    );
  });
});
