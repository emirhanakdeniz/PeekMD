import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextMenu } from "./ContextMenu";

describe("ContextMenu", () => {
  it("focuses the first action and supports arrow and Escape navigation", async () => {
    const close = vi.fn(); const origin = document.createElement("button"); document.body.append(origin);
    render(<ContextMenu position={{ x: 10, y: 10, returnFocus: origin }} hasSelection onClose={close} onCopy={vi.fn()} onOpenFile={vi.fn()} />);
    const copy = await screen.findByRole("menuitem", { name: /copy/i }); const open = screen.getByRole("menuitem", { name: /open file/i });
    await vi.waitFor(() => expect(copy).toHaveFocus()); fireEvent.keyDown(window, { key: "ArrowDown" }); expect(open).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" }); expect(close).toHaveBeenCalled(); expect(origin).toHaveFocus(); origin.remove();
  });
});
