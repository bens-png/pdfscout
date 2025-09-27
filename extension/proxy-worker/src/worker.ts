export default {
  async fetch(req: Request, env: { OPENAI_API_KEY: string }) {
    const cors = {
      "Access-Control-Allow-Origin": "*",                // tighten later
      "Access-Control-Allow-Headers": "content-type,x-ps-app",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Not found", { status: 404, headers: cors });

    // simple shared-secret header so random sites can’t call your proxy
    if (req.headers.get("x-ps-app") !== "plainsight") {
      return new Response("unauthorized", { status: 401, headers: cors });
    }

    type In = { text: string; mode: "paragraph" | "bullets" };
    const { text, mode } = (await req.json()) as In;

    const system = [
      "You simplify academic/technical text in plain, precise English.",
      "Rules:",
      "- Preserve all facts, numbers, units, and citation markers (e.g., [12], (Smith, 2020)).",
      "- Keep important terms verbatim; add a short bracketed definition only if needed.",
      "- Do NOT add new facts, analogies, or examples.",
      mode === "paragraph"
        ? "- Output one short paragraph (≤ 120 words)."
        : "- Output 3–6 concise bullet points. Start each with '-' or '•'."
    ].join("\n");

    const body = {
      // use any model your project allows (you can swap this later)
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: `TEXT:\n${text}` }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: `OpenAI HTTP ${r.status}` }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    type ResponsesContent = { text?: string };
    type ResponsesItem = { content?: ResponsesContent[] };
    type ResponsesData = { output_text?: string; output?: ResponsesItem[] };
    const data = (await r.json()) as ResponsesData;

    const out =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      "";

    return new Response(JSON.stringify({ text: (out ?? "").trim() }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
};
