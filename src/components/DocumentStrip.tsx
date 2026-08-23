import type { OpenedDocument } from "../lib/types";
import type { Theme } from "../lib/preferences";

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const Button = ({
  label,
  onClick,
  disabled,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    className={`strip-button ${className}`}
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

interface Props {
  document: OpenedDocument | null;
  zoom: number;
  theme: Theme;
  onOpen: () => void;
  onReload: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onTheme: () => void;
}

export function DocumentStrip({
  document,
  zoom,
  theme,
  onOpen,
  onReload,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  onTheme,
}: Props) {
  const themeTitle =
    theme === "system"
      ? "Theme: System (Click to switch to Light)"
      : theme === "light"
      ? "Theme: Light (Click to switch to Dark)"
      : "Theme: Dark (Click to switch to System)";

  return (
    <header className="document-strip">
      <div className="document-identity" title={document?.path ?? "No document open"}>
        <span className="markdown-mark" aria-hidden="true">
          M↓
        </span>
        <span className="document-name">{document?.filename ?? "PeekMD"}</span>
      </div>

      <nav className="strip-actions" aria-label="Document controls">
        <div className="strip-group">
          <Button label="Open Markdown file (Ctrl+O)" onClick={onOpen}>
            <Icon>
              <path d="M2.5 6.5h5l1.5 2h8.5l-1.6 7H4z" />
              <path d="M3.5 6.5V4h5l1.5 2h5" />
            </Icon>
          </Button>
          <Button label="Reload document (Ctrl+R)" onClick={onReload} disabled={!document}>
            <Icon>
              <path d="M15.5 7A6 6 0 1 0 16 12" />
              <path d="M12.5 7h3V4" />
            </Icon>
          </Button>
        </div>

        <span className="strip-divider" />

        <div className="strip-group zoom-group">
          <Button label="Zoom out (Ctrl + -)" onClick={onZoomOut} disabled={!document}>
            <Icon>
              <path d="M5 10h10" />
            </Icon>
          </Button>
          <Button
            label="Reset zoom to 100% (Ctrl + 0)"
            onClick={onResetZoom}
            disabled={!document}
            className="zoom-value"
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button label="Zoom in (Ctrl + +)" onClick={onZoomIn} disabled={!document}>
            <Icon>
              <path d="M5 10h10M10 5v10" />
            </Icon>
          </Button>
        </div>

        <span className="strip-divider" />

        <div className="strip-group">
          <Button label={themeTitle} onClick={onTheme} className="theme-toggle-button">
            <Icon>
              {theme === "dark" ? (
                <path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5A5.8 5.8 0 0 1 10 2.5Z" />
              ) : theme === "light" ? (
                <>
                  <circle cx="10" cy="10" r="4" />
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M4.34 15.66l1.42-1.42M14.24 5.76l1.42-1.42" />
                </>
              ) : (
                <>
                  <rect x="3" y="4" width="14" height="10" rx="2" />
                  <path d="M7 17h6M10 14v3" />
                </>
              )}
            </Icon>
          </Button>
        </div>
      </nav>
    </header>
  );
}
