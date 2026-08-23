import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

export type Theme = "system" | "light" | "dark";
export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.1;

export interface ViewerPreferences {
  theme: Theme;
  zoom: number;
}

function readValue<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function useViewerPreferences() {
  const [theme, setTheme] = useState<Theme>(() =>
    readValue("peekmd_theme", "system", (v): v is Theme => v === "system" || v === "light" || v === "dark")
  );
  const [zoom, setZoom] = useState(() =>
    readValue("peekmd_zoom", 1, (v): v is number => typeof v === "number" && v >= MIN_ZOOM && v <= MAX_ZOOM)
  );
  const isInitialMount = useRef(true);

  useEffect(() => {
    invoke<ViewerPreferences>("load_preferences")
      .then((prefs) => {
        if (prefs) {
          if (prefs.theme && (prefs.theme === "system" || prefs.theme === "light" || prefs.theme === "dark")) {
            setTheme(prefs.theme);
          }
          if (typeof prefs.zoom === "number" && prefs.zoom >= MIN_ZOOM && prefs.zoom <= MAX_ZOOM) {
            setZoom(prefs.zoom);
          }
        }
      })
      .catch(() => {
        // Fallback silently if Tauri backend is unavailable
      });
  }, []);

  const changeZoom = useCallback(
    (delta: number) =>
      setZoom((value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((value + delta).toFixed(2))))),
    []
  );
  const zoomIn = useCallback(() => changeZoom(ZOOM_STEP), [changeZoom]);
  const zoomOut = useCallback(() => changeZoom(-ZOOM_STEP), [changeZoom]);
  const resetZoom = useCallback(() => setZoom(1), []);
  const cycleTheme = useCallback(
    () => setTheme((value) => (value === "system" ? "light" : value === "light" ? "dark" : "system")),
    []
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("peekmd_theme", JSON.stringify(theme));
    } catch {
      /* unavailable */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--zoom-level", String(zoom));
    try {
      localStorage.setItem("peekmd_zoom", JSON.stringify(zoom));
    } catch {
      /* unavailable */
    }
  }, [zoom]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    void invoke("save_preferences", { preferences: { theme, zoom } }).catch(() => {
      /* backend unavailable */
    });
  }, [theme, zoom]);

  return { theme, zoom, zoomIn, zoomOut, resetZoom, cycleTheme };
}

