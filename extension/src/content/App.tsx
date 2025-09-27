import { useEffect, useRef, useState } from "react";
import Popover from "./Popover";

type Pt = { x: number; y: number };
type Sel = { text: string; anchor: Pt } | null;

function getSelectionInfo(): Sel {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return {
    text,
    anchor: { x: rect.right + window.scrollX, y: rect.top + window.scrollY },
  };
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [savedSel, setSavedSel] = useState<Sel>(null);
  const [bubblePos, setBubblePos] = useState<Pt | null>(null);
  const [open, setOpen] = useState(false);

  // Track text selection (but ignore events that originate inside our widget)
  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      const path = (e.composedPath && e.composedPath()) || [];
      if (containerRef.current && path.includes(containerRef.current)) {
        // clicks inside our shadow widget shouldn't change selection/bubble
        return;
      }
      const info = getSelectionInfo();
      if (info) {
        setSavedSel(info);
        setBubblePos({ x: info.anchor.x + 8, y: info.anchor.y - 8 });
      } else {
        // collapsed or cleared selection
        if (!open) {
          setSavedSel(null);
          setBubblePos(null);
        }
      }
    };
    document.addEventListener("mouseup", onMouseUp, true);
    return () => document.removeEventListener("mouseup", onMouseUp, true);
  }, [open]);

  // keyboard: Alt+S opens, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (savedSel) {
          e.preventDefault();
          setOpen(true);
        }
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [savedSel]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",     // container ignores pointer events
        zIndex: 2147483647,        // stay on top
      }}
    >
      {/* Bubble */}
      {bubblePos && !open && savedSel && (
        <div
          style={{
            position: "absolute",
            left: bubblePos.x,
            top: bubblePos.y,
            background: "#111",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 6px 16px rgba(0,0,0,.25)",
            cursor: "pointer",
            pointerEvents: "auto", // bubble is clickable
            userSelect: "none",
          }}
          onMouseDown={(e) => {
            // prevent selection from collapsing when you click the bubble
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (savedSel) setOpen(true);
          }}
          title="simplify (Alt+S)"
        >
          simplify ⌥S
        </div>
      )}

      {/* Popover */}
      {open && savedSel && (
        <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "auto" }}>
          <Popover
            anchor={{ x: savedSel.anchor.x + 8, y: savedSel.anchor.y + 22 }}
            text={savedSel.text}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
