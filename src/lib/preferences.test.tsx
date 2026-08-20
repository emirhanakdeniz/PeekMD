import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useViewerPreferences } from "./preferences";

describe("viewer preferences", () => {
  beforeEach(() => localStorage.clear());
  it("persists bounded zoom and theme values", () => {
    const { result } = renderHook(() => useViewerPreferences());
    act(() => { result.current.zoomIn(); result.current.cycleTheme(); });
    expect(result.current.zoom).toBe(1.1); expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("peekmd_zoom")).toBe("1.1"); expect(localStorage.getItem("peekmd_theme")).toBe('"light"');
  });
});
