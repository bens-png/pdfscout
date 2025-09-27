const PHRASE_MAP: Record<string,string> = {
  "in order to":"to","utilize":"use","facilitate":"help","prior to":"before",
  "subsequently":"then","demonstrate":"show","indicates":"shows","endeavor":"try"
};

const STOP = new Set(["the","a","an","of","for","to","in","on","and","or","with"]);

export type SimplifyOpts = {
  mode: "paragraph"|"bullets";
  inlineGlossary: boolean;
  glossary: Record<string,string>;   // e.g., {"homeostasis":"body's balance system"}
};

export function simplify(raw: string, opts: SimplifyOpts) {
  const sentences = splitSentences(raw).flatMap(splitLong);
  const processed = sentences.map(s => {
    const keptNumbers = s.match(/\d[\d,]*(\.\d+)?\s?(%|[a-zA-Z]+)?/g) || [];
    let t = replacePhrases(s);
    const terms = detectTerms(t);
    if (opts.inlineGlossary) {
      t = addInlineDefs(t, terms, opts.glossary);
    }
    // sanity: if numbers disappeared, revert to original sentence
    for (const n of keptNumbers) if (!t.includes(n)) t = s;
    return t.trim();
  });

  if (opts.mode === "bullets") {
    const bullets = compressToBullets(processed);
    return { bullets, simple: "", terms: extractTermDefs(processed.join(" "), opts.glossary) };
  }
  const simple = tidyParagraph(processed);
  return { simple, bullets: [], terms: extractTermDefs(processed.join(" "), opts.glossary) };
}

function contentWordCount(s: string) {
  const words = s.toLowerCase().match(/\b[a-z0-9']+\b/g) ?? [];
  return words.filter(w => !STOP.has(w)).length;
}

function splitSentences(text:string){ 
  return text.match(/[^.!?]+[.!?]+|\S+$/g) ?? [text];
}

function splitLong(s:string){
  if (s.split(/\s+/).length <= 24) return [s];
  return s.split(/\s*,\s*(?:and|which|that|while|because)\s*/i);
}

function replacePhrases(s:string){
  let t = " " + s.toLowerCase() + " ";
  for (const [k,v] of Object.entries(PHRASE_MAP)) {
    t = t.replace(new RegExp(`\\b${k}\\b`,"g"), ` ${v} `);
  }
  // restore capitalization of sentence start
  t = t.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function detectTerms(s:string){
  // crude heuristic: sequences of Capitalized words, or Word(word) form
  const terms = new Set<string>();
  const capTerms = s.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || [];
  capTerms.forEach(t => terms.add(t));
  const paren = s.match(/\b([A-Za-z][A-Za-z0-9\- ]+)\s*\(([A-Za-z0-9-]+)\)/g) || [];
  paren.forEach(p => terms.add(p.split("(")[0].trim()));
  return Array.from(terms);
}

function addInlineDefs(s:string, terms:string[], dict:Record<string,string>){
  let out = s;
  for (const t of terms) {
    const def = dict[t.toLowerCase()];
    if (!def) continue;
    const rx = new RegExp(`\\b${escapeRegExp(t)}\\b`);
    out = out.replace(rx, `${t} [${def}]`);
  }
  return out;
}

function extractTermDefs(text:string, dict:Record<string,string>){
  const res:{term:string, def:string}[] = [];
  for (const [k,v] of Object.entries(dict)) {
    const rx = new RegExp(`\\b${escapeRegExp(k)}\\b`, "i");
    if (rx.test(text)) res.push({term:k, def:v});
  }
  return res;
}

function compressToBullets(sentences:string[]){
  // take the 3–6 most informative by length & presence of verbs
  const scored = sentences.map(s => ({ s, score: scoreSentence(s) }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,6).map(x=>x.s.replace(/\s+/g," ").trim());
  return Array.from(new Set(scored)); // dedupe
}

function scoreSentence(s: string){
  const len = Math.min(s.split(/\s+/).length, 40);
  const verbs = (s.match(/\b(is|are|was|were|has|have|does|do|did|shows?|finds?|improves?)\b/ig)||[]).length;
  const content = contentWordCount(s);
  // prefer sentences with verbs + content words, lightly penalize length
  return verbs*10 + content*2 + (40 - len);
}

function tidyParagraph(sentences:string[]){
  // keep coherence, join with spaces, cap to ~5 sentences
  return sentences.slice(0,5).join(" ").replace(/\s+/g," ").trim();
}
function escapeRegExp(s:string){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
