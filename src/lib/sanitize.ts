import DOMPurify from "dompurify";

export function sanitizeMarkdown(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["class", "checked", "disabled", "type"],
    ADD_TAGS: ["input"],
    FORBID_ATTR: ["srcset", "style"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}
