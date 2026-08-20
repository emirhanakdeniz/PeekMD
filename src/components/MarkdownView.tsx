import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useRef, useState } from "react";
import type { OpenedDocument } from "../lib/types";
import { sanitizeMarkdown } from "../lib/sanitize";
import { classifyLink } from "../lib/links";

interface Props {
  openedDocument: OpenedDocument;
  onOpenRelative: (href: string) => Promise<OpenedDocument | null>;
  onFeedback: (message: string) => void;
  onRendered: () => void;
}

export function MarkdownView({ openedDocument, onOpenRelative, onFeedback, onRendered }: Props) {
  const [html, setHtml] = useState("");
  const articleRef = useRef<HTMLElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const pendingFragment = useRef<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/markdown.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    const id = ++requestRef.current;
    const worker = workerRef.current;
    if (!worker) return;
    worker.onmessage = ({ data }: MessageEvent<{ id: number; html?: string; error?: string }>) => {
      if (data.id !== requestRef.current) return;
      if (data.error) { onFeedback(data.error); onRendered(); return; }
      setHtml(sanitizeMarkdown(data.html ?? ""));
      onRendered();
      if (pendingFragment.current) {
        const fragment = pendingFragment.current; pendingFragment.current = null;
        requestAnimationFrame(() => globalThis.document.getElementById(fragment)?.scrollIntoView());
      }
    };
    worker.postMessage({ id, markdown: openedDocument.content });
  }, [openedDocument.content, onFeedback, onRendered]);

  useEffect(() => {
    const root = articleRef.current; if (!root) return;
    for (const image of root.querySelectorAll<HTMLImageElement>("img[src]")) {
      const source = image.getAttribute("src") ?? "";
      if (/^(https?:|data:)/i.test(source)) continue;
      image.removeAttribute("src");
      invoke<string>("resolve_local_asset", { documentPath: openedDocument.path, source })
        .then((path) => { image.src = convertFileSrc(path); })
        .catch(() => { image.alt = image.alt ? `${image.alt} — image unavailable` : "Local image unavailable"; image.classList.add("image-unavailable"); });
    }
  }, [openedDocument.path, html]);

  const handleClick = async (event: React.MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest("a"); if (!anchor) return;
    event.preventDefault(); const href = anchor.getAttribute("href") ?? ""; const kind = classifyLink(href);
    if (kind === "fragment") {
      const id = decodeURIComponent(href.slice(1)); globalThis.document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); return;
    }
    if (kind === "external") { try { await openUrl(href); } catch { onFeedback("The link could not be opened in your default app."); } return; }
    if (kind === "markdown") {
      const fragment = href.split("#")[1]; pendingFragment.current = fragment ? decodeURIComponent(fragment) : null;
      const opened = await onOpenRelative(href); if (!opened) pendingFragment.current = null;
      return;
    }
    onFeedback("Only web links, email links, headings, and Markdown documents can be opened.");
  };

  if (openedDocument.content.length === 0) {
    return <section className="center-state" aria-labelledby="empty-document-title"><div className="state-mark">∅</div><h1 id="empty-document-title">This document is empty</h1><p>Add Markdown content, then reload the file.</p></section>;
  }
  return <article ref={articleRef} className="document-container markdown-body" onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
