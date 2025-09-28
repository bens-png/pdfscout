import { useEffect, useMemo, useState } from "react";

type Pt = { x: number; y: number };
type Props = { anchor: Pt; text: string; onClose: () => void };

// const API_BASE = "https://plainsight-proxy.pdfscout.workers.dev";

export default function Popover({ anchor, text, onClose }: Props) {
  type Mode = "paragraph" | "bullets" | "normal" | "analogy";
  const [mode, setMode] = useState<Mode>("paragraph");

  const [pos, setPos] = useState<Pt>({ x: anchor.x, y: anchor.y + 22 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState<Pt>({ x: 0, y: 0 });

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };
    const handleUp = () => setDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, offset]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [aiText, setAiText] = useState<string>("");

  async function runAI() {
    setErr("");
    setLoading(true);
    // setAiText("");

    // try {
    //   const res = await fetch(API_BASE, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "x-ps-app": "plainsight", // must match Worker check
    //     },
    //     body: JSON.stringify({ text, mode }),
    //   });

    //   const data: { text?: string; error?: string } = await res.json();
    //   if (data.error) {
    //     setErr(data.error);
    //     return;
    //   }
    //   setAiText((data.text ?? "").trim());
    // } catch (e) {
    //   setErr(e instanceof Error ? e.message : String(e));
    // } finally {
    await new Promise(r => setTimeout(r, 300)); // fake delay
    setAiText("⚠️ AI disabled for now (this is just a placeholder).");

      setLoading(false);
    // }
  }

  useEffect(() => {
      void runAI();
    }, [text, mode]);

  const bullets = useMemo(() => {
    if (mode !== "bullets") return [];
    const lines = aiText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items = lines.flatMap(line => {
      const m = line.match(/^(\u2022|-|\d+\.)\s*(.*)$/);
      return m ? [m[2] || ""] : [line];
    }).filter(Boolean);
    return items.slice(0, 6);
  }, [aiText, mode]);

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        maxWidth: 480,
        background: "#fff",
        color: "#111",
        border: "1px solid rgba(6, 4, 4, 0.1)",
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,.22)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
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
          userSelect: "none"
        }}
      >
        {/* First dropdown: Summarize/Explain */}
        <div
          style={{ display: "flex", gap: 10, alignItems: "center" }}
        >
          <select
            style={{ width: "100px", borderRadius: 7, padding: "4px" }}
            value={mode === "paragraph" || mode === "bullets" ? "summarize" : "explain"}
            onChange={(e) => {
              const v = e.target.value as "summarize" | "explain"; 
              if (v === "summarize") {
                setMode("paragraph"); 
              } else {
                setMode("normal"); 
              }
            }}
          >
            <option value="summarize">summarize</option>
            <option value="explain">explain</option>
          </select>

          {/* Second dropdown: depends on first */}
          {(mode === "paragraph" || mode === "bullets") ? (
            <select
              style={{ width: "100px", borderRadius: 7, padding: "4px" }}
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="paragraph">paragraph</option>
              <option value="bullets">bullets</option>
            </select>
          ) : (
            <select
              style={{ width: "100px", borderRadius: 7, padding: "4px" }}
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="normal">normal</option>
              <option value="analogy">analogy</option>
            </select>
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
        <div style={{ padding: "8px 10px", color: "#a94442", background: "#fff5f5", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
          {err}
        </div>
      )}

      <div style={{ padding: 12, lineHeight: 1.5 }}>
        {loading ? (
          <div style={{ opacity: 0.7 }}>thinking…</div>
        ) : mode === "bullets" ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        ) : (
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{aiText}</p>
        )}
      </div>
    </div>
  );
}