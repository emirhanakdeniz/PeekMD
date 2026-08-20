import { Marked } from "marked";
import Prism from "prismjs";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-yaml.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-markdown.js";

const aliases: Record<string, string> = { js: "javascript", ts: "typescript", py: "python", rs: "rust", sh: "bash", shell: "bash", zsh: "bash", yml: "yaml", md: "markdown", "c++": "cpp", "c#": "csharp", cs: "csharp", golang: "go" };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (value) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[value]!);
export const safeLanguage = (value = "") => value.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9_+#.-]/g, "");
export const slugBase = (value: string) => value.toLowerCase().trim().replace(/<[^>]*>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-") || "section";

export function renderMarkdown(markdown: string) {
  const slugs = new Map<string, number>();
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({ renderer: {
    code({ text, lang }) {
      const requested = safeLanguage(lang); const language = aliases[requested] ?? requested; const grammar = Prism.languages[language];
      let highlighted = escapeHtml(text); if (grammar) { try { highlighted = Prism.highlight(text, grammar, language); } catch { /* escaped fallback */ } }
      const className = `language-${language || "plaintext"}`;
      return `<pre class="${className}"><code class="${className}">${highlighted}</code></pre>\n`;
    },
    heading({ tokens, depth }) {
      const html = this.parser.parseInline(tokens); const base = slugBase(html); const count = slugs.get(base) ?? 0; slugs.set(base, count + 1);
      return `<h${depth} id="${count ? `${base}-${count}` : base}">${html}</h${depth}>\n`;
    }
  }});
  return marked.parse(markdown) as string;
}

self.onmessage = ({ data }: MessageEvent<{ id: number; markdown: string }>) => {
  try { self.postMessage({ id: data.id, html: renderMarkdown(data.markdown) }); }
  catch (error) { self.postMessage({ id: data.id, error: error instanceof Error ? error.message : "Markdown rendering failed." }); }
};
