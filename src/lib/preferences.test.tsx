import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useViewerPreferences } from "./preferences";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === "load_preferences") return Promise.resolve({ theme: "system", zoom: 1.0 });
    if (cmd === "save_preferences") return Promise.resolve();
    return Promise.resolve();
  }),
}));

describe("viewer preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("persists bounded zoom and theme values", () => {
    const { result } = renderHook(() => useViewerPreferences());
    act(() => {
      result.current.zoomIn();
      result.current.cycleTheme();
    });
    expect(result.current.zoom).toBe(1.1);
    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("peekmd_zoom")).toBe("1.1");
    expect(localStorage.getItem("peekmd_theme")).toBe('"light"');
  });

  it("loads preferences from backend on mount", async () => {
    vi.mocked(tauriCore.invoke).mockImplementation((cmd: string) => {
      if (cmd === "load_preferences") {
        return Promise.resolve({ theme: "dark", zoom: 1.2 });
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() => useViewerPreferences());
    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
      expect(result.current.zoom).toBe(1.2);
    });
  });
});

