export type LinkKind = "fragment" | "markdown" | "external" | "unsupported";

export function classifyLink(href: string): LinkKind {
  if (href.startsWith("#")) return "fragment";
  if (/^(https?:|mailto:)/i.test(href)) return "external";
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) return "unsupported";
  return /\.(md|markdown)$/i.test(href.split(/[?#]/)[0]) ? "markdown" : "unsupported";
}
