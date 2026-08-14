"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { navItems } from "@/data/content";
import { useSmoothScroll } from "@/hooks/useInView";

const paletteItems = [
  ...navItems.map((item) => ({
    label: item.label,
    section: item.href.replace("#", ""),
    type: "navigation" as const,
  })),
  { label: "Install ReconPro", section: "", type: "action" as const, action: "install" },
  { label: "View on GitHub", section: "", type: "action" as const, action: "github" },
  { label: "Copy Install Command", section: "", type: "action" as const, action: "copy" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTo = useSmoothScroll();

  const filtered = useMemo(
    () => paletteItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const handleOpen = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpen(!open);
      }
      if (e.key === "Escape") handleOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleOpen]);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0);  
  }, [query]);

  const execute = useCallback(
    (item: (typeof paletteItems)[0]) => {
      if (item.type === "navigation" && item.section) {
        scrollTo(item.section);
      } else if (item.type === "action" && item.action === "github") {
        window.open("/about", "_self");
      } else if (item.type === "action" && item.action === "copy") {
        navigator.clipboard.writeText("pip install reconpro");
      }
      handleOpen(false);
    },
    [scrollTo, handleOpen]
  );

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      execute(filtered[activeIndex]);
    }
  };

  return (
    <div
      className={`command-palette-overlay ${open ? "open" : ""}`}
      onClick={() => handleOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-white/40 flex-shrink-0"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            role="combobox"
            aria-expanded={open}
            aria-controls="cmd-results"
            aria-activedescendant={filtered[activeIndex] ? `cmd-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-label="Search commands"
          />
          <kbd className="text-[10px] text-white/15 bg-white/[0.03] px-1.5 py-0.5 rounded-md border border-white/[0.05] flex-shrink-0 font-mono" aria-hidden="true">
            ESC
          </kbd>
        </div>
        <div
          className="command-palette-results"
          role="listbox"
          id="cmd-results"
          aria-label="Command results"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-white/60">
              No results found
            </div>
          ) : (
            filtered.map((item, i) => (
              <div
                key={item.label}
                className={`command-palette-item ${i === activeIndex ? "active" : ""}`}
                onClick={() => execute(item)}
                onMouseEnter={() => setActiveIndex(i)}
                role="option"
                id={`cmd-option-${i}`}
                aria-selected={i === activeIndex}
                tabIndex={-1}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/40 flex-shrink-0"
                  aria-hidden="true"
                >
                  {item.type === "navigation" ? (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </>
                  ) : (
                    <>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4Z" />
                    </>
                  )}
                </svg>
                <span>{item.label}</span>
                {item.section && (
                  <kbd className="font-mono" aria-hidden="true">↵</kbd>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 px-5 py-3 border-t border-white/[0.03]" aria-hidden="true">
          <span className="text-[10px] text-white/40 flex items-center gap-1">
            <kbd className="font-mono bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.04] text-[9px]">↑↓</kbd>
            navigate
          </span>
          <span className="text-[10px] text-white/40 flex items-center gap-1">
            <kbd className="font-mono bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.04] text-[9px]">↵</kbd>
            open
          </span>
          <span className="text-[10px] text-white/40 flex items-center gap-1">
            <kbd className="font-mono bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.04] text-[9px]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
