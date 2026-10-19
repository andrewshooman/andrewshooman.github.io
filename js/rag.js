/*
 * Portfolio RAG, entirely client-side.
 *   1. Chunk: profile, project write-ups and every repo README (split by heading).
 *   2. Retrieve: BM25 over stemmed tokens, with a small query-expansion table.
 *   3. Answer: extractive — the best-matching sentences from the top chunks, with
 *      citations. Nothing is generated, so nothing can be hallucinated.
 */
(function () {
  const STOP = new Set("a an and are as at be by can do does for from has have he her his how i in is it its me my of on or our she so that the their them they this to was we were what when where which who why will with you your about into than then there these those also just only any all more most some such not no yes".split(" "));
  const EXPAND = {
    llm: ["language", "model", "ollama", "claude", "gemini", "openai", "prompt", "langchain"],
    llms: ["llm"],
    ai: ["model", "llm", "ml"],
    ml: ["machine", "learning", "model", "lightgbm", "feature"],
    rl: ["reinforcement", "ppo", "rlgym", "agent"],
    agent: ["agents", "autonomous", "bot"],
    trading: ["trade", "market", "flip", "price"],
    game: ["games", "rpg", "runescape", "rocket"],
    contact: ["email", "hire", "linkedin"],
    hire: ["role", "full", "time", "contact"],
    experience: ["consultant", "client", "professional", "work"],
    azure: ["databricks", "pipeline", "data", "factory"],
    stack: ["python", "fastapi", "javascript", "java", "rust"],
    eval: ["evaluation", "benchmark", "elo", "backtest"],
    evaluat: ["elo", "objective", "deterministic", "reproducible", "benchmark", "backtest"],
    built: ["build", "project", "app"],
  };

  const stem = (w) => {
    if (w.length > 5 && /ions?$/.test(w)) return w.replace(/ions?$/, "");
    if (w.length > 4) return w.replace(/(ings?|edly|ed|ies|es|s|ly)$/, "");
    if (w.length > 3 && /[^s]s$/.test(w)) return w.slice(0, -1);
    return w;
  };
  const tokenize = (s) => (s.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*[a-z0-9+#]|[a-z0-9]/g) || [])
    .filter((w) => !STOP.has(w)).map(stem);

  const cleanMd = (md) => md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\n[ \t]+(?![-*+]\s|\d+\.\s)(?=\S)/g, " ") // fold wrapped list items onto one line
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?[-:| ]+\|?\s*$/gm, " ")
    // bullets / numbered items / table rows become their own sentences
    .replace(/^\s*(?:[-*+]|\d+\.)\s+(.+?)\s*$/gm, (_, t) => (/[.!?:]$/.test(t) ? t : t + "."))
    .replace(/^\s*\|(.+)\|\s*$/gm, (_, t) => t.split("|").map((c) => c.trim()).filter(Boolean).join(", ") + ".")
    .replace(/[*_`>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  function chunkReadme(repo, title, md) {
    const out = [];
    const parts = md.split(/\n(?=#{1,3} )/);
    parts.forEach((p) => {
      const m = p.match(/^#{1,3} (.+)/);
      const section = m ? m[1].replace(/[*`]/g, "").trim() : "Overview";
      // skip setup boilerplate; it's noise for "what did he build" questions
      if (/^(install|setup|quick ?start|running|run locally|license|contributing|prerequisites|support|donat|tip|thanks|acknowledg|changelog|todo|roadmap|future|low priority|high priority|medium priority|known issues|troubleshoot)/i.test(section)) return;
      const text = cleanMd(p.replace(/^#{1,3} .+/, ""));
      if (text.length < 60) return;
      // keep chunks small so citations are precise
      const sents = text.split(/(?<=[.!?])\s+/);
      for (let i = 0, part = 0; i < sents.length; i += 8, part++) {
        // fold a short tail into the previous chunk so it can't win on length alone
        if (part && sents.length - i < 3) { out[out.length - 1].text += " " + sents.slice(i).join(" "); break; }
        out.push({ repo, title, section, part, text: sents.slice(i, i + 8).join(" ") });
      }
    });
    return out;
  }

  class Index {
    constructor() { this.docs = []; this.k1 = 1.2; this.b = 0.5; this.ignore = new Set(); this.seen = new Set(); }
    add(doc) {
      const key = doc.text.toLowerCase().replace(/\W+/g, "");
      if (this.seen.has(key)) return; // same text in two READMEs (e.g. a plugin mirrored into its own repo)
      this.seen.add(key); doc.tokens = tokenize(`${doc.title} ${doc.section} ${doc.text}`); this.docs.push(doc); this.dirty = true; }
    build() {
      const N = this.docs.length;
      this.df = new Map();
      this.docs.forEach((d) => { d.tf = new Map(); d.tokens.forEach((t) => d.tf.set(t, (d.tf.get(t) || 0) + 1)); d.tf.forEach((_, t) => this.df.set(t, (this.df.get(t) || 0) + 1)); });
      this.avg = this.docs.reduce((a, d) => a + d.tokens.length, 0) / (N || 1);
      this.idf = (t) => { const n = this.df.get(t) || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)); };
      this.dirty = false;
    }
    search(q, k = 5) {
      if (this.dirty) this.build();
      const base = tokenize(q).filter((t) => !this.ignore.has(t));
      const terms = new Map(base.map((t) => [t, 1]));
      base.forEach((t) => (EXPAND[t] || []).forEach((e) => { const s = stem(e); if (!terms.has(s)) terms.set(s, 0.4); }));
      const scored = this.docs.map((d) => {
        let s = 0;
        terms.forEach((wq, t) => {
          const f = d.tf.get(t); if (!f) return;
          s += wq * this.idf(t) * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * d.tokens.length / this.avg));
        });
        if (d.boost) s *= d.boost;
        if (d.part) s *= 0.85; // the start of a section usually states its point
        // a section heading that answers the question ("How the model works") is a strong signal
        const titleToks = new Set(tokenize(d.title));
        const secHits = tokenize(d.section).filter((t) => terms.get(t) === 1 && !titleToks.has(t)).length;
        if (s && secHits) s *= 1 + 0.35 * secHits;
        return { d, s };
      }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
      return { terms, hits: scored.slice(0, k) };
    }
  }

  function answer(index, q) {
    const { terms, hits } = index.search(q, 6);
    if (!hits.length) return { sentences: [], hits, terms };
    // pick the best sentences from the top chunks, at most two per chunk.
    // Words from the project's own name are ignored here: the chunk already matched on
    // them, and every sentence in a README mentions its project.
    const cands = [];
    hits.slice(0, 4).forEach((h, ci) => {
      const own = new Set(tokenize(h.d.title));
      h.d.text.split(/(?<=[.!?])\s+/).forEach((s, pos) => {
        const toks = tokenize(s);
        let sc = 0; toks.forEach((t) => { if (terms.has(t) && !own.has(t)) sc += terms.get(t) * index.idf(t); });
        const rank = 1 / (1 + ci * 0.5);
        if (s.length > 30 && s.length < 400) cands.push({ s: s.charAt(0).toUpperCase() + s.slice(1), sc: (sc / Math.sqrt(toks.length + 6) + 0.6) * rank / (1 + pos * 0.12), ci, pos, raw: sc });
      });
    });
    cands.sort((a, b) => b.sc - a.sc);
    const picked = [], perChunk = {}, used = new Set();
    for (const c of cands) {
      if (picked.length >= 4) break;
      if (c.raw === 0 && (c.ci > 0 || picked.length >= 3)) continue; // filler only from the best chunk
      const key = c.s.toLowerCase().replace(/\W+/g, "");
      if (used.has(key)) continue;
      if ((perChunk[c.ci] = (perChunk[c.ci] || 0) + 1) > 3) continue;
      used.add(key); picked.push(c);
    }
    // read in source order so the answer flows
    picked.sort((a, b) => a.ci - b.ci || a.pos - b.pos);
    return { sentences: picked, hits, terms };
  }

  window.PortfolioRAG = { Index, chunkReadme, cleanMd, answer, tokenize };
})();
