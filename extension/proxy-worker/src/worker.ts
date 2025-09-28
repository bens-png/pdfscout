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

    type In = { text: string; mode: "paragraph" | "bullets" | "normal" | "analogy"};
    const { text, mode } = (await req.json()) as In;

    const system = [
      "You are a writing and explanation assistant embedded in a browser extension.",
      "Rules:",
      "- Stay faithful to the provided text; don’t invent facts.",
      "- Preserve key terms, numbers, and qualifiers; expand uncommon acronyms on first mention.",
      "- Be concise and avoid filler.",
      "- Match the input language; if mixed, default to the language used most in the input.",
      "- Output only in the requested format; no preambles or conclusions.",
      "- If the text is code or math, keep symbols and code blocks intact.",

      mode === "paragraph"
      ? ["- Write the summary as a short paragraph.",
        "- Be concise.",
        "- Leave out unimportant details.",
        "- Include every significant piece of information.",
        "- Use the correct terms.",
        "- Be as little wordy as possible."].join("\n")

      : mode === "bullets"
      ? ["- Split the text into key points.",
        "- Leave out unimportant or insignificant details.",
        "- Be concise for each point.",
        "- Do not leave out any important details.",
        "- Use the correct terms."].join("\n")

      : mode === "normal" 
      ? ["- Explain what the text means in simple terms.",
        "- Make the explanation easy to understand for beginners.",
        "- Provide any necessary context that a beginner might not already know.",
        "- Be concise.",
        "- Ensure the explanation is accurate and not misleading.",
        "- Give a simple explanation of any key abbreviation, acronym, or term that may confuse a beginner.",
        "- Keep such definitions brief, concise, accurate, and easy to understand."].join("\n")

      : ["- Explain what the text means in simple terms.",
        "- Make the explanation easy to understand.",
        "- Use an analogy that helps clarify any concept involved.",
        "- Provide context where necessary.",
        "- Clearly indicate what each part of the analogy corresponds to in the real concept.",
        "- Be concise.",
        "- Do not leave out any important explanation.",
        "- Avoid being wordy."].join("\n")
    ].join("\n");

    const body = {
      // use any model your project allows (you can swap this later)
      model: "gpt-4.1-mini",
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
