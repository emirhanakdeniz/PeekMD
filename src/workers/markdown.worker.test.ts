import { describe, expect, it } from "vitest";
import { renderMarkdown, safeLanguage } from "./markdown.worker";

describe("Markdown worker renderer", () => {
  it("escapes language class input", () => expect(safeLanguage('ts" onmouseover="bad')).toBe("ts"));
  it("generates stable duplicate-safe heading ids", () => {
    const html = renderMarkdown("# Hello, World!\n\n# Hello, World!");
    expect(html).toContain('id="hello-world"'); expect(html).toContain('id="hello-world-1"');
  });
});
