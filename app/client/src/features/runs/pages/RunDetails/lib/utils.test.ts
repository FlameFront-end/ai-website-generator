import { describe, it, expect } from "vitest";
import {
  formatStep,
  getProgress,
  formatArtifactType,
  humanizeTechnicalKey,
  translateLogMessage,
  getLanguageFromPath,
  shortenArtifactPath,
} from "./utils";
import type { RunArtifact } from "@/api/services/runs";

describe("humanizeTechnicalKey", () => {
  it("replaces underscores and dashes with spaces and capitalizes first letter", () => {
    expect(humanizeTechnicalKey("prepare_brief")).toBe("Prepare brief");
    expect(humanizeTechnicalKey("build-project")).toBe("Build project");
    expect(humanizeTechnicalKey("some__double_underscore")).toBe(
      "Some double underscore",
    );
  });

  it("handles single word", () => {
    expect(humanizeTechnicalKey("queued")).toBe("Queued");
  });

  it("handles empty string", () => {
    expect(humanizeTechnicalKey("")).toBe("");
  });
});

describe("formatStep", () => {
  it("returns label for known step", () => {
    expect(formatStep("queued")).toBe("В очереди");
    expect(formatStep("completed")).toBe("Завершено");
  });

  it("falls back to humanized key for unknown step", () => {
    expect(formatStep("some_unknown_step")).toBe("Some unknown step");
  });

  it("returns fallback for null", () => {
    expect(formatStep(null)).toBe("Ожидаем статус пайплайна");
  });
});

describe("getProgress", () => {
  it("returns 100 for completed status", () => {
    expect(getProgress("queued", "completed")).toBe(100);
  });

  it("returns 100 for failed status", () => {
    expect(getProgress("queued", "failed")).toBe(100);
  });

  it("returns step progress for known step", () => {
    expect(getProgress("queued", "running")).toBe(5);
    expect(getProgress("prepare_brief", "running")).toBe(10);
  });

  it("returns 12 for unknown step", () => {
    expect(getProgress("something_unknown", "running")).toBe(12);
  });

  it("returns 12 for null step", () => {
    expect(getProgress(null, "running")).toBe(12);
  });
});

describe("formatArtifactType", () => {
  it("returns label for known artifact type", () => {
    const artifact = {
      type: "frontend_project",
      path: "some/path",
    } as RunArtifact;
    expect(formatArtifactType(artifact)).toBe("Клиентский проект");
  });

  it("humanizes unknown artifact type", () => {
    const artifact = {
      type: "unknown_type",
      path: "some/path",
    } as RunArtifact;
    expect(formatArtifactType(artifact)).toBe("Unknown type");
  });

  it("formats style_variant_image with file stem", () => {
    const artifact = {
      type: "style_variant_image",
      path: "runs/1/style/modern-dark.png",
    } as RunArtifact;
    expect(formatArtifactType(artifact)).toBe("Превью стиля: Modern dark");
  });
});

describe("translateLogMessage", () => {
  it("translates known log messages", () => {
    expect(translateLogMessage("Запуск поставлен в очередь")).toBe(
      "Проект добавлен в очередь",
    );
  });

  it("returns original message when not in dictionary", () => {
    expect(translateLogMessage("Unknown message")).toBe("Unknown message");
  });

  it("translates build attempt pattern", () => {
    expect(translateLogMessage("Попытка сборки 3")).toBe(
      "Проверка сборки: попытка 3",
    );
  });

  it('translates step confirmation pattern', () => {
    expect(translateLogMessage('Шаг "prepare_brief" подтверждён')).toBe(
      'Шаг подтверждён: Подготовка брифа',
    );
  });
});

describe("getLanguageFromPath", () => {
  it("maps known extensions", () => {
    expect(getLanguageFromPath("app.tsx")).toBe("typescript");
    expect(getLanguageFromPath("style.css")).toBe("css");
    expect(getLanguageFromPath("data.json")).toBe("json");
    expect(getLanguageFromPath("page.html")).toBe("html");
    expect(getLanguageFromPath("readme.md")).toBe("markdown");
    expect(getLanguageFromPath("app.scss")).toBe("scss");
  });

  it("returns plaintext for unknown extension", () => {
    expect(getLanguageFromPath("file.xyz")).toBe("plaintext");
  });

  it("handles path with directories", () => {
    expect(getLanguageFromPath("src/components/App.tsx")).toBe("typescript");
  });
});

describe("shortenArtifactPath", () => {
  it("strips everything before and including /runs/ segment", () => {
    expect(shortenArtifactPath("/data/runs/42/artifacts/file.png")).toBe(
      "42/artifacts/file.png",
    );
  });

  it("returns full path when /runs/ not present", () => {
    expect(shortenArtifactPath("/other/path/file.png")).toBe(
      "/other/path/file.png",
    );
  });
});
