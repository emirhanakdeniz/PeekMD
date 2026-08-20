import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { ContextMenu, type ContextMenuPosition } from "./components/ContextMenu";
import { DocumentStrip } from "./components/DocumentStrip";
import { MarkdownView } from "./components/MarkdownView";
import { useDocumentController } from "./lib/documentController";
import { useViewerPreferences } from "./lib/preferences";

export default function App() {
  const controller = useDocumentController();
  const preferences = useViewerPreferences();
  const { state, notice, dismissNotice, pick, reload, openPath, openRelative, renderingDone } = controller;
  const { theme, zoom, zoomIn, zoomOut, resetZoom, cycleTheme } = preferences;
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [menu, setMenu] = useState<ContextMenuPosition | null>(null);
  const copyText = useRef("");
  const current = state.status === "ready" ? state.document : null;
  const announce = useCallback((message: string) => setFeedback(message), []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "over") setDragging(true);
      else if (event.payload.type === "drop") {
        setDragging(false); const paths = event.payload.paths;
        if (paths.length !== 1) announce("Drop one Markdown file at a time."); else void openPath(paths[0]);
      } else setDragging(false);
    }).then((dispose) => { unlisten = dispose; }).catch(() => announce("Drag and drop is unavailable in this window."));
    return () => unlisten?.();
  }, [announce, openPath]);

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault(); const target = event.target as HTMLElement;
      copyText.current = window.getSelection()?.toString() || target.closest("pre")?.textContent || "";
      setMenu({ x: event.clientX, y: event.clientY, returnFocus: target });
    };
    window.addEventListener("contextmenu", onContextMenu); return () => window.removeEventListener("contextmenu", onContextMenu);
  }, []);

  const copy = useCallback(async () => {
    if (!copyText.current) return;
    try { await navigator.clipboard.writeText(copyText.current); announce("Copied to clipboard."); }
    catch { announce("The selected text could not be copied."); }
  }, [announce]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const control = event.ctrlKey || event.metaKey;
      if (control && event.key.toLowerCase() === "o") { event.preventDefault(); void pick(); }
      else if ((control && event.key.toLowerCase() === "r") || event.key === "F5") { event.preventDefault(); void reload(); }
      else if (control && event.key.toLowerCase() === "t") { event.preventDefault(); cycleTheme(); }
      else if (control && (event.key === "+" || event.key === "=" || event.code === "NumpadAdd")) { event.preventDefault(); zoomIn(); }
      else if (control && (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract")) { event.preventDefault(); zoomOut(); }
      else if (control && (event.key === "0" || event.code === "Numpad0")) { event.preventDefault(); resetZoom(); }
    };
    const wheel = (event: WheelEvent) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); if (event.deltaY < 0) zoomIn(); else zoomOut(); } };
    window.addEventListener("keydown", keydown); window.addEventListener("wheel", wheel, { passive: false });
    return () => { window.removeEventListener("keydown", keydown); window.removeEventListener("wheel", wheel); };
  }, [pick, reload, cycleTheme, resetZoom, zoomIn, zoomOut]);

  const error = state.status === "error" ? state.error : null;
  return <main className="viewer-layout">
    <DocumentStrip document={current} zoom={zoom} theme={theme} onOpen={() => void pick()} onReload={() => void reload()} onZoomOut={zoomOut} onResetZoom={resetZoom} onZoomIn={zoomIn} onTheme={cycleTheme} />
    {dragging && <div className="drag-overlay"><div className="drag-card"><span className="markdown-mark">M↓</span><strong>Open this Markdown document</strong><span>Release to view it in PeekMD</span></div></div>}
    {notice && <div className="notice" role="alert"><span>{notice.message}</span><button type="button" onClick={dismissNotice} aria-label="Dismiss message">×</button></div>}
    <div className="reader-stage">
      {state.status === "loading" && <section className="center-state" aria-busy="true"><div className="loading-line"/><p>Preparing your document…</p></section>}
      {state.status === "empty" && <section className="center-state"><div className="state-mark">M↓</div><h1>Open a Markdown document</h1><p>Choose a .md or .markdown file, or drop one into this window.</p><button className="primary-button" type="button" onClick={() => void pick()}>Open Markdown file</button></section>}
      {error && <section className="center-state error-state" role="alert"><div className="state-mark">!</div><h1>Unable to open document</h1><p>{error.message}</p><button className="primary-button" type="button" onClick={() => void pick()}>Choose another file</button></section>}
      {current && <MarkdownView openedDocument={current} onOpenRelative={openRelative} onFeedback={announce} onRendered={renderingDone} />}
      {state.status === "ready" && state.rendering && state.document.content.length > 0 && <div className="rendering-status" role="status">Rendering…</div>}
    </div>
    <div className="sr-live" aria-live="polite">{feedback}</div>
    <ContextMenu position={menu} hasSelection={!!copyText.current} onClose={() => setMenu(null)} onCopy={() => void copy()} onOpenFile={() => void pick()} />
  </main>;
}
