import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { MarkdownView } from "./components/MarkdownView";
import { ContextMenu, ContextMenuPosition } from "./components/ContextMenu";
import { OpenedFile } from "./lib/markdown";

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.1;

export type Theme = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "peekmd_theme";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }
  return "system";
}

function App() {
  const [file, setFile] = useState<OpenedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const copyTextRef = useRef<string>("");

  // File operations
  const openFilePath = useCallback(async (path: string) => {
    try {
      const opened = await invoke<OpenedFile>("open_file", { path });
      setFile(opened);
      setError(null);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to open document.");
    }
  }, []);

  const handleOpenFile = useCallback(async () => {
    try {
      const chosen = await invoke<OpenedFile | null>("pick_and_open_file");
      if (chosen) {
        setFile(chosen);
        setError(null);
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to open document.");
    }
  }, []);

  const handleReloadFile = useCallback(async () => {
    if (!file?.path) return;
    try {
      const reloaded = await invoke<OpenedFile>("reload_file", { path: file.path });
      setFile(reloaded);
      setError(null);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to reload document.");
    }
  }, [file?.path]);

  // Theme switcher
  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === "system") return "light";
      if (prev === "light") return "dark";
      return "system";
    });
  }, []);

  // Persist and apply theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Initial load
  useEffect(() => {
    async function loadInitial() {
      try {
        const initial = await invoke<OpenedFile | null>("get_initial_file");
        if (initial) {
          setFile(initial);
          setError(null);
        }
      } catch (err) {
        setError(typeof err === "string" ? err : "Failed to load document.");
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, []);

  // Tauri drag and drop listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupDragDrop() {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === "over") {
            setIsDraggingOver(true);
          } else if (event.payload.type === "drop") {
            setIsDraggingOver(false);
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              openFilePath(paths[0]);
            }
          } else {
            setIsDraggingOver(false);
          }
        });
      } catch (err) {
        console.error("Failed to register drag-drop handler:", err);
      }
    }

    setupDragDrop();

    return () => {
      if (unlisten) unlisten();
    };
  }, [openFilePath]);

  // Custom Context Menu handler (disables default webview context menu)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      const selection = window.getSelection()?.toString() || "";
      const target = e.target as HTMLElement | null;
      const codeBlock = target?.closest("pre");
      const textToCopy = selection || (codeBlock ? codeBlock.textContent || "" : "");

      copyTextRef.current = textToCopy;
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const handleCopy = useCallback(() => {
    const text = copyTextRef.current || window.getSelection()?.toString() || "";
    if (text) {
      navigator.clipboard.writeText(text).catch((err) => {
        console.error("Failed to copy text:", err);
      });
    }
  }, []);

  // Keyboard shortcuts and wheel zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + Shift + T or Ctrl + T: Cycle theme (system -> light -> dark)
      if (isCtrl && (e.key.toLowerCase() === "t" || e.code === "KeyT")) {
        e.preventDefault();
        cycleTheme();
        return;
      }

      // Ctrl + O: Open file
      if (isCtrl && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenFile();
        return;
      }

      // Ctrl + R: Reload file
      if (isCtrl && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleReloadFile();
        return;
      }

      // F5: Reload file
      if (e.key === "F5") {
        e.preventDefault();
        handleReloadFile();
        return;
      }

      // Ctrl + Plus / = / NumpadAdd: Zoom in
      if (isCtrl && (e.key === "=" || e.key === "+" || e.code === "NumpadAdd")) {
        e.preventDefault();
        setZoomLevel((prev) => Math.min(Number((prev + ZOOM_STEP).toFixed(2)), MAX_ZOOM));
        return;
      }

      // Ctrl + Minus / - / NumpadSubtract: Zoom out
      if (isCtrl && (e.key === "-" || e.key === "_" || e.code === "NumpadSubtract")) {
        e.preventDefault();
        setZoomLevel((prev) => Math.max(Number((prev - ZOOM_STEP).toFixed(2)), MIN_ZOOM));
        return;
      }

      // Ctrl + 0 / Numpad0: Reset zoom
      if (isCtrl && (e.key === "0" || e.code === "Numpad0")) {
        e.preventDefault();
        setZoomLevel(1);
        return;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        setZoomLevel((prev) => {
          const next = Number((prev + delta).toFixed(2));
          return Math.min(Math.max(next, MIN_ZOOM), MAX_ZOOM);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [handleOpenFile, handleReloadFile, cycleTheme]);

  // Apply zoom level to document
  useEffect(() => {
    document.documentElement.style.setProperty("--zoom-level", zoomLevel.toString());
  }, [zoomLevel]);

  if (loading) {
    return <main className="viewer-layout" />;
  }

  return (
    <main className="viewer-layout">
      {isDraggingOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-message">Drop Markdown file to open</div>
        </div>
      )}
      <MarkdownView
        content={file?.content}
        error={error ?? undefined}
        onOpenFile={handleOpenFile}
      />
      <ContextMenu
        position={contextMenuPos}
        hasSelection={!!copyTextRef.current}
        onClose={() => setContextMenuPos(null)}
        onCopy={handleCopy}
        onOpenFile={handleOpenFile}
      />
    </main>
  );
}

export default App;
