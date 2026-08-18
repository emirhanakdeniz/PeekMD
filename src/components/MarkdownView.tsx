import React, { useMemo } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { renderMarkdown } from "../lib/markdown";

interface MarkdownViewProps {
  content?: string;
  error?: string;
  onOpenFile?: () => void;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  error,
  onOpenFile,
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return "";
    return renderMarkdown(content);
  }, [content]);

  const handleDocumentClick = async (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor) {
      const href = anchor.getAttribute("href");
      if (href && /^(https?:|mailto:|ftp:)/i.test(href)) {
        e.preventDefault();
        try {
          await openUrl(href);
        } catch (err) {
          console.error("Failed to open URL:", err);
        }
      }
    }
  };

  if (error) {
    return (
      <div className="error-state">
        <p className="error-title">Unable to open document</p>
        <p className="error-message">{error}</p>
        {onOpenFile && (
          <button type="button" className="btn-secondary" onClick={onOpenFile}>
            Open File (Ctrl+O)
          </button>
        )}
      </div>
    );
  }

  if (!content) {
    return (
      <div className="placeholder-state">
        <p className="placeholder-title">No document open</p>
        <p className="placeholder-hint">
          Press <kbd>Ctrl</kbd> + <kbd>O</kbd> or drag and drop a Markdown file here
        </p>
      </div>
    );
  }

  return (
    <article
      className="document-container markdown-body"
      onClick={handleDocumentClick}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
