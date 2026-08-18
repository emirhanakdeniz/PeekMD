import { Marked } from "marked";
import DOMPurify from "dompurify";
import Prism from "prismjs";

export interface OpenedFile {
  path: string;
  filename: string;
  content: string;
}

// Import common syntax highlighting definitions
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightCode(code: string, lang?: string): string {
  if (!lang) {
    return escapeHtml(code);
  }

  // Normalize language aliases
  const langAliases: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rs: "rust",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    yml: "yaml",
    md: "markdown",
    "c++": "cpp",
    "c#": "csharp",
    cs: "csharp",
    golang: "go",
  };

  const normalized = langAliases[lang.toLowerCase()] || lang.toLowerCase();
  const grammar = Prism.languages[normalized];

  if (grammar) {
    try {
      return Prism.highlight(code, grammar, normalized);
    } catch {
      return escapeHtml(code);
    }
  }

  return escapeHtml(code);
}

const markedInstance = new Marked({
  gfm: true,
  breaks: false,
});

markedInstance.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang || "").split(/\s+/)[0];
      const highlighted = highlightCode(text, language);
      const className = language ? `language-${language}` : "language-plaintext";
      return `<pre class="${className}"><code class="${className}">${highlighted}</code></pre>\n`;
    },
  },
});

export function renderMarkdown(markdown: string): string {
  if (!markdown) {
    return "";
  }
  const rawHtml = markedInstance.parse(markdown) as string;
  if (typeof window !== "undefined") {
    const purify = typeof DOMPurify.sanitize === "function" ? DOMPurify : (DOMPurify as unknown as (win: Window) => typeof DOMPurify)(window);
    return purify.sanitize(rawHtml, {
      ADD_ATTR: ["target", "rel", "class", "checked", "disabled", "type"],
      ADD_TAGS: ["input"],
    });
  }
  return rawHtml;
}
