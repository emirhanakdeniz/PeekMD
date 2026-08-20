import React, { useEffect, useRef } from "react";

export interface ContextMenuPosition {
  x: number;
  y: number;
  returnFocus?: HTMLElement;
}

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  hasSelection: boolean;
  onClose: () => void;
  onCopy: () => void;
  onOpenFile: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  hasSelection,
  onClose,
  onCopy,
  onOpenFile,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const enabledItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    requestAnimationFrame(() => enabledItems()[0]?.focus());

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        position.returnFocus?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = enabledItems();
        const index = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
        items[(index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault(); const items = enabledItems(); items[e.key === "Home" ? 0 : items.length - 1]?.focus();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", onClose);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [position, onClose]);

  if (!position) return null;

  // Clamp within viewport
  const menuWidth = 180;
  const menuHeight = 85;
  const x = Math.max(8, Math.min(position.x, window.innerWidth - menuWidth - 8));
  const y = Math.max(8, Math.min(position.y, window.innerHeight - menuHeight - 8));

  return (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      onContextMenu={(e) => e.preventDefault()}
      role="menu"
      aria-label="Document actions"
    >
      <button
        type="button"
        className={`context-menu-item ${!hasSelection ? "disabled" : ""}`}
        disabled={!hasSelection}
        role="menuitem"
        onClick={() => {
          onCopy();
          onClose();
        }}
      >
        <span className="context-menu-label">Copy</span>
        <span className="context-menu-shortcut">Ctrl+C</span>
      </button>

      <div className="context-menu-separator" role="separator" />

      <button
        type="button"
        className="context-menu-item"
        role="menuitem"
        onClick={() => {
          onOpenFile();
          onClose();
        }}
      >
        <span className="context-menu-label">Open File...</span>
        <span className="context-menu-shortcut">Ctrl+O</span>
      </button>
    </div>
  );
};
