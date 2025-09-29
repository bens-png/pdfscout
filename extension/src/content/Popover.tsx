import { useEffect, useMemo, useRef, useState, type CSSProperties, type SelectHTMLAttributes } from "react";

type Pt = { x: number; y: number };
type Props = { anchor: Pt; text: string; onClose: () => void };
type SProps = SelectHTMLAttributes<HTMLSelectElement> & { width?: number; height?: number };

const ensureInter = () => {
  if (document.getElementById("ps-inter-font")) return;
  const link = document.createElement("link");
  link.id = "ps-inter-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
  document.head.appendChild(link);
};

export function SelectElevate({ style, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, ...props }: SProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const [focus, setFocus] = useState(false);

  const s: CSSProperties = {
    width: "100px",
    height: "30px",
    border: `1px solid ${focus ? "rgba(0,0,0,.20)" : "rgba(0,0,0,.12)"}`,
    borderRadius: 7,
    padding: "4px 10px",
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
    ...style,
  };

     return (
      <select
        {...props}
        style={s}
        onMouseEnter={(e) => { setHover(true);  onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHover(false); setActive(false); onMouseLeave?.(e); }}
        onMouseDown={(e) => { setActive(true);  onMouseDown?.(e); }}
        onMouseUp={(e)   => { setActive(false); onMouseUp?.(e); }}
        onFocus={(e)     => { setFocus(true);   onFocus?.(e); }}
        onBlur={(e)      => { setFocus(false);  onBlur?.(e); }}
      />
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
    await new Promise((r) => setTimeout(r, 300)); // fake delay
    setAiText("⚠️ AI disabled for now (this is just a placeholder).");
    setLoading(false);
  }

  useEffect(() => {
    void runAI();
  }, [text, mode]);

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
        minWidth: 260,
        maxHeight: 600,
        minHeight: 120,
        background: "#fff",
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
      <div
        onMouseDown={startDrag}
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(0,0,0,.06)",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SelectElevate
            value={mode === "paragraph" || mode === "bullets" ? "summarize" : "explain"}
            onChange={(e) => setMode((e.target.value as "summarize" | "explain") === "summarize" ? "paragraph" : "normal")}
          >
            <option value="summarize">Summarize</option>
            <option value="explain">Explain</option>
          </SelectElevate>

          {(mode === "paragraph" || mode === "bullets") ? (
            <SelectElevate
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="paragraph">Paragraph</option>
              <option value="bullets">Bullets</option>
            </SelectElevate>
          ) : (
            <SelectElevate
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="normal">Normal</option>
              <option value="analogy">Analogy</option>
            </SelectElevate>
          )}
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

      <div style={{ padding: 12, lineHeight: 1.5 }}>
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
