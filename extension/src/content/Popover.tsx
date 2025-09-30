import { useEffect, useMemo, useRef, useState, useLayoutEffect, useId, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Pt = { x: number; y: number };
type Props = { anchor: Pt; text: string; onClose: () => void };

const ensureInter = () => {
  if (document.getElementById("ps-inter-font")) return;
  const link = document.createElement("link");
  link.id = "ps-inter-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
  document.head.appendChild(link);
};

type Opt = { value: string; label: string };

const srOnly: CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0
};

// global event bus so only one menu is open at a time
const inlineSelectBus: EventTarget =
  (typeof window !== "undefined"
    ? ((window as any).__InlineSelectBus ||= new EventTarget())
    : new EventTarget());

function InlineSelect({
  value, onChange, options, style, disabled, label = "Select", trackKey,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  style?: CSSProperties;
  disabled?: boolean;
  label?: string;
  trackKey?: any;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); 
  const [menuShown, setMenuShown] = useState(false); 
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0 });
  const [hoverIndex, setHoverIndex] = useState(
    Math.max(0, options.findIndex(o => o.value === value))
  );

  // SelectElevate-style trigger animation states
  const [hover, setHover]   = useState(false);
  const [active, setActive] = useState(false);
  const [focus, setFocus]   = useState(false);

  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const labelId   = `${uid}-label`;

  useEffect(() => { setMounted(true); }, []);

  // Close when another InlineSelect opens
  useEffect(() => {
    const onAnyOpen = (e: Event) => {
      const owner = (e as CustomEvent<string>).detail;
      if (owner !== uid) setOpen(false);
    };
    inlineSelectBus.addEventListener("inline-select-open", onAnyOpen as EventListener);
    return () => inlineSelectBus.removeEventListener("inline-select-open", onAnyOpen as EventListener);
  }, [uid]);

  const computePos = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect(); // border-box measurements
    setPos({
      left: Math.round(r.left),
      top: Math.round(r.bottom + 4),
      width: Math.round(r.width),
    });
  };

  useLayoutEffect(() => { if (open) computePos(); }, [open]);
  useLayoutEffect(() => { if (open) computePos(); }, [trackKey]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => listRef.current?.focus());
    setMenuShown(false);
    const id = requestAnimationFrame(() => setMenuShown(true));

    const onScrollOrResize = () => computePos();
    const onDocDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onDocDown);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [open]);

  const commit = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const base: CSSProperties = {
    width: 110,
    lineHeight: "22px",
    minHeight: 30,
    padding: "4px 28px 4px 10px", 
    border: `1px solid ${focus ? "rgba(0,0,0,.20)" : "rgba(0,0,0,.12)"}`,
    borderRadius: 7,
    background: "#fff",
    transition: "box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease",
    boxShadow: focus
      ? "0 0 0 4px rgba(98,127,255,.18), 0 6px 14px rgba(0,0,0,.08)"
      : active
      ? "0 3px 8px rgba(0,0,0,.08)"
      : hover
      ? "0 6px 14px rgba(0,0,0,.08)"
      : "none",
    outline: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    position: "relative",
    textAlign: "left",
    boxSizing: "border-box",
    ...style,
  };

  const arrow: CSSProperties = {
    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
    width: 16, height: 16, pointerEvents: "none", opacity: .7
  };

  return (
    <>
      {/* Visually hidden label to name the widget */}
      <span id={labelId} style={srOnly}>{label}</span>

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onMouseDown={(e) => { e.stopPropagation(); setActive(true); }}
        onMouseUp={() => setActive(false)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setActive(false); }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onClick={() => {
          if (!open) {
            // tell others to close, then open this one
            inlineSelectBus.dispatchEvent(new CustomEvent("inline-select-open", { detail: uid }));
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
              inlineSelectBus.dispatchEvent(new CustomEvent("inline-select-open", { detail: uid }));
              setOpen(true);
            }
          }
          if ((e.key === "Enter" || e.key === " ") && !open) {
            e.preventDefault();
            inlineSelectBus.dispatchEvent(new CustomEvent("inline-select-open", { detail: uid }));
            setOpen(true);
          }
        }}
        style={base}
      >
        {options.find(o => o.value === value)?.label ?? "Select"}
        <svg viewBox="0 0 24 24" style={arrow} fill="none" stroke="#666" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && mounted && createPortal(
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          aria-activedescendant={`${listboxId}-opt-${hoverIndex}`}
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            width: pos.width,                   // match trigger width exactly
            boxSizing: "border-box",            // include border in width
            maxHeight: 240,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarGutter: "stable",
            background: "#fff",
            border: "1px solid rgba(0,0,0,.12)",
            borderRadius: 7,
            boxShadow: "0 12px 28px rgba(0,0,0,.18)",
            zIndex: 2147483647,
            willChange: "transform, opacity",
            // subtle open animation
            opacity: menuShown ? 1 : 0,
            transform: menuShown ? "translateY(0) scale(1)" : "translateY(-4px) scale(0.98)",
            transition: "opacity 140ms ease, transform 140ms ease",
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHoverIndex(i => Math.min(options.length - 1, i + 1)); }
            if (e.key === "ArrowUp")   { e.preventDefault(); setHoverIndex(i => Math.max(0, i - 1)); }
            if (e.key === "Home")      { e.preventDefault(); setHoverIndex(0); }
            if (e.key === "End")       { e.preventDefault(); setHoverIndex(options.length - 1); }
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const i = hoverIndex; if (i >= 0) commit(i); }
            if (e.key === "Escape") setOpen(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {options.map((o, i) => (
            <div
              id={`${listboxId}-opt-${i}`}
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(i)}
              style={{
                padding: "8px 10px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                background: i === hoverIndex ? "rgba(0,0,0,.04)" : "transparent",
                fontSize: 14,
                fontWeight: o.value === value ? 600 : 400,
                cursor: "pointer"
              }}
            >
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function Popover({ anchor, text, onClose }: Props) {
  type Mode = "paragraph" | "bullets" | "normal" | "analogy";
  const [mode, setMode] = useState<Mode>("paragraph");

  // start exactly at the provided anchor; App already adds any extra offset
  const [pos, setPos] = useState<Pt>({ x: anchor.x, y: anchor.y });

  // drag state
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef<Pt>({ x: 0, y: 0 });

  const draggingRef = useRef(false);
  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);
  
  useEffect(() => {
    ensureInter();
  }, []);

  useEffect(() => {
    // only snap to new selection if we're not currently dragging
    if (!draggingRef.current) {
      setPos({ x: anchor.x, y: anchor.y });
    }
  }, [anchor.x, anchor.y]); // <-- note: no `dragging` here

  const isInteractive = (el: EventTarget | null) => {
    if (!(el instanceof HTMLElement)) return false;
    return !!el.closest(
      "select,button,input,textarea,a,[role='button'],[contenteditable='true']"
    );
  };

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // left click only
    if (isInteractive(e.target)) return; // don't drag when using controls
    setDragging(true);
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const o = offsetRef.current;
      setPos({ x: e.clientX - o.x, y: e.clientY - o.y });
    };
    const handleUp = () => setDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [aiText, setAiText] = useState<string>("");

  async function runAI() {
    setErr("");
    setLoading(true);
    // await new Promise((r) => setTimeout(r, 300)); // fake delay
    setAiText("⚠️ AI disabled for now (this is just a placeholder).");
    setLoading(false);
  }

  useEffect(() => {
    void runAI();
  }, [text, mode]);

  const [gearHover, setGearHover] = useState(false);
  const [gearActive, setGearActive] = useState(false);

  const gearStyle: CSSProperties = {
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background: gearActive ? "rgba(0,0,0,.06)" : gearHover ? "rgba(0,0,0,.04)" : "transparent",
    boxShadow: gearActive ? "inset 0 1px 2px rgba(0,0,0,.12)" : "none",
    transform: gearActive ? "translateY(1px)" : "none",
    color: "#555",
    cursor: "pointer",
    transition: "background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, color 120ms ease",
    userSelect: "none",
  };

  const bullets = useMemo(() => {
    if (mode !== "bullets") return [];
    const lines = aiText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const items = lines
      .flatMap((line) => {
        const m = line.match(/^(\u2022|-|\d+\.)\s*(.*)$/);
        return m ? [m[2] || ""] : [line];
      })
      .filter(Boolean);
    return items.slice(0, 6);
  }, [aiText, mode]);

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        maxWidth: 480,
        minWidth: 323,
        maxHeight: 600,
        minHeight: 120,
        background: "transparent",
        color: "#111",
        border: "1px solid rgba(6, 4, 4, 0.1)",
        borderRadius: 12,
        boxShadow: "0 12px 28px rgba(0,0,0,.22)",
        fontFamily:
        '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        fontSize: 14,
        cursor: dragging ? "grabbing" : "default",
        resize: "both",
        overflow: "auto",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ position:"relative" }}>
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
          background:"rgba(255,255,255,0.55)",
          backdropFilter:"saturate(160%) blur(10px)",
          WebkitBackdropFilter:"saturate(160%) blur(10px)",
          borderBottom:"1px solid rgba(0,0,0,.06)"
        }}/>
        
        <div
          onMouseDown={startDrag}
          style={{
            position:"relative", zIndex:1,
            display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
            cursor:"grab", userSelect:"none"
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <InlineSelect
              trackKey={`${pos.x},${pos.y}`}  
              value={mode === "paragraph" || mode === "bullets" ? "summarize" : "explain"}
              onChange={(v) => setMode(v === "summarize" ? "paragraph" : "normal")}
              options={[
                { value:"summarize", label:"Summarize" },
                { value:"explain",   label:"Explain" },
              ]}
            >
            </InlineSelect>

            {(mode === "paragraph" || mode === "bullets") ? (
              <InlineSelect
                trackKey={`${pos.x},${pos.y}`}   
                value={mode}
                onChange={(v) => setMode(v as Mode)}
                options={[
                  { value: "paragraph", label: "Paragraph" }, 
                  { value: "bullets", label: "Bullets" }]}
              >
              </InlineSelect>
            ) : (
              <InlineSelect
                trackKey={`${pos.x},${pos.y}`}   
                value={mode}
                onChange={(v) => setMode(v as Mode)}
                options={[
                  { value:"normal",  label:"Normal" },
                  { value:"analogy", label:"Analogy" },
                ]}
              >
              </InlineSelect>
            )}
          </div>

          <div
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              role="button"
              aria-label="Settings"
              title="Settings"
              tabIndex={0}
              style={gearStyle}
              onMouseDown={(e) => { e.stopPropagation(); setGearActive(true); }}
              onMouseUp={() => setGearActive(false)}
              onMouseEnter={() => setGearHover(true)}
              onMouseLeave={() => { setGearHover(false); setGearActive(false); }}
              onClick={() => {
                // TODO: open your settings panel/menu here
                // setSettingsOpen(v => !v)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  // setSettingsOpen(v => !v)
                }
              }}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.3l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.26 1 1.51H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </div>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 16,
                fontWeight: "bold",
                color: "#666",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div
          style={{
            padding: "8px 10px",
            color: "#a94442",
            background: "#fff5f5",
            borderBottom: "1px solid rgba(0,0,0,.06)",
          }}
        >
          {err}
        </div>
      )}

      <div style={{ background: "#fff", padding: 12, lineHeight: 1.5, height: "100%" }}>
        {loading ? (
          <div style={{ opacity: 0.7 }}>thinking…</div>
        ) : mode === "bullets" ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{aiText}</p>
        )}
      </div>
    </div>
  );
}
