import { describe, expect, it } from "vitest";
import { sanitizeMarkdown } from "./sanitize";

describe("sanitizeMarkdown", () => {
  it("removes executable markup and unhandled image attributes", () => {
    const result = sanitizeMarkdown('<img src="x" srcset="evil" onerror="alert(1)" style="position:fixed"><script>alert(1)</script>');
    expect(result).toBe('<img src="x">');
  });
});
