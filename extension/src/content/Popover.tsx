import { useEffect, useMemo, useState } from "react";

type Pt = { x: number; y: number };
type Props = { anchor: Pt; text: string; onClose: () => void };

const API_BASE = "https://plainsight-proxy.pdfscout.workers.dev";

export default function Popover({ anchor, text, onClose }: Props) {
  type Mode = "paragraph" | "bullets" | "normal" | "analogy";
  const [mode, setMode] = useState<Mode>("paragraph");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [aiText, setAiText] = useState<string>("");

  async function runAI() {
    setErr("");
    setLoading(true);
    setAiText("");

    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ps-app": "plainsight", // must match Worker check
        },
        body: JSON.stringify({ text, mode }),
      });

      const data: { text?: string; error?: string } = await res.json();
      if (data.error) {
        setErr(data.error);
        return;
      }
      setAiText((data.text ?? "").trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void runAI(); });

  const bullets = useMemo(() => {
    if (mode !== "bullets") return [];
    const lines = aiText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items = lines.flatMap(line => {
      const m = line.match(/^(\u2022|-|\d+\.)\s*(.*)$/);
      return m ? [m[2] || ""] : [line];
    }).filter(Boolean);
    return items.slice(0, 6);
  }, [aiText, mode]);

  async function copyOut() {
    const payload = mode === "bullets" ? "• " + bullets.join("\n• ") : aiText;
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      console.log("[plainsight] copied");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = payload;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: anchor.x,
        top: anchor.y + 22,
        maxWidth: 480,
        background: "#fff",
        color: "#111",
        border: "1px solid rgba(0,0,0,.1)",
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,.22)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        fontSize: 14,
        pointerEvents: "auto",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 10px",
          borderBottom: "1px solid rgba(0,0,0,.06)"
        }}
      >
        {/* First dropdown: Summarize/Explain */}
        <select
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
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="paragraph">paragraph</option>
            <option value="bullets">bullets</option>
          </select>
        ) : (
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="normal">normal</option>
            <option value="analogy">analogy</option>
          </select>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={copyOut}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,.12)", background: "#f6f6f6", cursor: "pointer" }}>
            copy
          </button>
          <button onClick={onClose}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,.12)", background: "#f6f6f6", cursor: "pointer" }}>
            close
          </button>
        </div>
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