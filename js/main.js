(function () {
  const P = window.PORTFOLIO;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ACRONYMS = new Set(["ai", "ge", "osrs", "epl", "rl", "ml", "llm", "comp", "api", "ui"]);
  const prettify = (repo) => repo.split(/[-_]/).map((w) => ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/([a-z])(\d)/gi, "$1 $2");
  const ago = (iso) => {
    const d = (Date.now() - new Date(iso)) / 864e5;
    return d < 1 ? "today" : d < 2 ? "yesterday" : d < 31 ? `${Math.floor(d)}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`;
  };

  /* ---------- theme ---------- */
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
  const setTheme = (t) => { document.documentElement.dataset.theme = t; store.set("theme", t); dispatchEvent(new Event("themechange")); };
  const saved = store.get("theme");
  document.documentElement.dataset.theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  $("#themeToggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));

  /* ---------- hero ---------- */
  const person = P.person;
  $("#heroEyebrow").textContent = `${person.title} · ${person.location}`;
  $("#heroName").textContent = person.name;
  $("#heroSummary").textContent = person.summary;
  $("#ghLink").href = `https://github.com/${P.github}`;
  window.Visuals.hero($("#net"));
  const statCell = (k, label, value) => `<div><dt>${esc(label)}</dt><dd data-stat="${k}">${esc(value)}</dd></div>`;
  $("#liveStats").innerHTML = (P.heroStats || []).map((s, i) => statCell("s" + i, s.label, s.value)).join("") +
    statCell("repos", "github projects", "—") + statCell("push", "last push", "—");

  (function typeLoop() {
    const el = $("#typed"), lines = person.taglines;
    let li = 0, ci = 0, del = false;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = lines[0]; return; }
    (function tick() {
      const line = lines[li];
      ci += del ? -1 : 1;
      el.textContent = line.slice(0, ci);
      let wait = del ? 22 : 38 + Math.random() * 40;
      if (!del && ci === line.length) { del = true; wait = 2400; }
      else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 400; }
      setTimeout(tick, wait);
    })();
  })();

  /* ---------- project model ---------- */
  const featuredByRepo = new Map(P.featured.map((f) => [f.repo, f]));
  let projects = P.featured.map((f) => ({ ...f, featured: true, description: f.blurb, skills: f.stack, languages: {}, url: `https://github.com/${P.github}/${f.repo}` }));
  const byRepo = () => new Map(projects.map((p) => [p.repo, p]));

  const inferTags = (r) => {
    const s = `${r.name} ${r.description} ${r.topics.join(" ")}`.toLowerCase(), t = new Set(r.topics);
    if (/\b(ai|ml|model|neural|learning|bot|predict|lightgbm|torch)\b/.test(s)) t.add("ai");
    if (/\b(llm|gpt|ollama|claude|gemini|langchain|prompt)\b/.test(s)) t.add("llm");
    if (/\b(game|rpg|osrs|runelite|rocket|league|golf|plugin|handball)\b/.test(s)) t.add("games");
    if (/\b(stats|statistics|data|analytics|final)\b/.test(s) || ["R", "TeX"].includes(r.language)) t.add("data");
    if (["JavaScript", "TypeScript", "HTML", "CSS"].includes(r.language)) t.add("web");
    return [...t];
  };

  function mergeRepos(repos) {
    const hidden = new Set(P.hidden || []);
    const m = byRepo();
    repos.forEach((r) => {
      const langs = Object.keys(r.languages || {}).sort((a, b) => r.languages[b] - r.languages[a]);
      if (m.has(r.name)) {
        Object.assign(m.get(r.name), { gh: r, languages: r.languages, pushed: r.pushed, stars: r.stars, homepage: r.homepage, branch: r.branch });
      } else if (!hidden.has(r.name)) {
        projects.push({
          repo: r.name, name: (P.names || {})[r.name] || prettify(r.name), description: r.description, gh: r, featured: false,
          tags: inferTags(r), skills: [...new Set([...langs.slice(0, 3), ...r.topics.filter((t) => t !== "portfolio")])],
          languages: r.languages, pushed: r.pushed, stars: r.stars, url: r.url, homepage: r.homepage, branch: r.branch,
          weight: r.topics.includes("portfolio") ? 3 : 0, isNew: r.topics.includes("portfolio") && (Date.now() - new Date(r.created)) / 864e5 < 60,
        });
      }
    });
    (P.offGithub || []).forEach((o) => { if (!m.has(o.repo)) projects.push({ ...o, featured: false, offGithub: true, languages: {}, weight: 1 }); });
    projects.forEach((p) => { if (p.featured) p.weight = 6; });
  }

  /* ---------- featured ---------- */
  function renderFeatured() {
    const root = $("#featured");
    root.innerHTML = P.featured.map((f, i) => `
      <article class="feat reveal" data-repo="${esc(f.repo)}">
        <div class="feat-vis"><canvas aria-label="Animated illustration of ${esc(f.name)}"></canvas><span class="vis-label mono">fig.${i + 1} — live sketch, simulated data</span></div>
        <div class="feat-body">
          <p class="kicker mono">${esc(f.kicker)}</p>
          <h3>${esc(f.name)}</h3>
          <p class="blurb">${esc(f.blurb)}</p>
          <ul>${f.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          <div class="metrics">${(f.metrics || []).map((m) => `<div class="metric"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join("")}</div>
          <div class="stack">${f.stack.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>
          <div class="repo-meta" data-meta></div>
          <div class="feat-actions">
            <button class="btn primary" data-open="${esc(f.repo)}">Read the deep-dive</button>
            ${f.live ? `<a class="btn" href="${esc(f.live)}" target="_blank" rel="noopener">Live app ↗</a>` : ""}
            <a class="btn ghost" href="https://github.com/${P.github}/${esc(f.repo)}" target="_blank" rel="noopener">Code ↗</a>
          </div>
        </div>
      </article>`).join("");
    root.querySelectorAll(".feat").forEach((el) => window.Visuals.mount(el.querySelector("canvas"), featuredByRepo.get(el.dataset.repo).visual));
  }
  function fillFeaturedMeta() {
    document.querySelectorAll(".feat").forEach((el) => {
      const p = byRepo().get(el.dataset.repo);
      if (!p || !p.gh) return;
      const top = Object.keys(p.languages || {}).sort((a, b) => p.languages[b] - p.languages[a])[0];
      el.querySelector("[data-meta]").innerHTML =
        `${top ? `<span><i class="lang-dot" style="background:${GH.langColor(top)}"></i>${esc(top)}</span>` : ""}<span>updated ${ago(p.pushed)}</span>${p.stars ? `<span>★ ${p.stars}</span>` : ""}`;
    });
  }

  /* ---------- grid ---------- */
  const FILTERS = [["all", "All"], ["ai", "AI / ML"], ["llm", "LLM"], ["games", "Games"], ["web", "Web"], ["data", "Data"]];
  let filter = "all", query = "";
  function renderChips() {
    $("#filterChips").innerHTML = FILTERS.map(([k, l]) => `<button class="chip" role="tab" data-f="${k}" aria-selected="${k === filter}">${l}</button>`).join("");
  }
  $("#filterChips").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; renderChips(); renderGrid(); });
  $("#repoSearch").addEventListener("input", (e) => { query = e.target.value.toLowerCase(); renderGrid(); });

  function renderGrid() {
    const list = projects
      .filter((p) => filter === "all" || (p.tags || []).includes(filter))
      .filter((p) => !query || `${p.name} ${p.repo} ${p.description} ${(p.skills || []).join(" ")}`.toLowerCase().includes(query))
      .sort((a, b) => (b.featured - a.featured) || new Date(b.pushed || 0) - new Date(a.pushed || 0));
    $("#repoGrid").innerHTML = list.length ? list.map((p) => {
      const top = Object.keys(p.languages || {}).sort((a, b) => p.languages[b] - p.languages[a])[0] || p.gh?.language;
      const col = GH.langColor(top);
      const desc = p.featured ? p.blurb.split(/(?<=\.)\s/)[0] : (p.description || p.readmeLead || "No description yet.");
      return `<button class="card" data-open="${esc(p.repo)}">
        ${p.featured ? `<span class="badge">featured</span>` : p.isNew ? `<span class="badge">new</span>` : p.offGithub ? `<span class="badge">private</span>` : ""}
        ${Visuals.glyph(p.repo, col)}
        <h4>${esc(p.name)}</h4>
        <p>${esc(desc)}</p>
        <div class="repo-meta">${top ? `<span><i class="lang-dot" style="background:${col}"></i>${esc(top)}</span>` : ""}${p.pushed ? `<span>${ago(p.pushed)}</span>` : p.offGithub ? `<span>${esc((p.skills || []).slice(0, 3).join(" · "))}</span>` : ""}</div>
      </button>`;
    }).join("") : `<p class="empty">// no projects match</p>`;
  }

  /* ---------- stats + languages ---------- */
  function renderStats(data) {
    const own = data.repos;
    const langs = {};
    own.forEach((r) => Object.entries(r.languages || {}).forEach(([l, b]) => (langs[l] = (langs[l] || 0) + b)));
    const latest = own.map((r) => r.pushed).sort().at(-1);
    const set = (k, v) => ($(`[data-stat="${k}"]`).textContent = v);
    set("repos", own.length || "—");
    set("push", latest ? ago(latest) : "—");

    // Language mix excludes rendered-notebook HTML that would swamp the chart.
    delete langs.TeX;
    const htmlHeavy = own.find((r) => r.name === "stats-final-project");
    if (htmlHeavy && langs.HTML) langs.HTML -= htmlHeavy.languages.HTML || 0;
    const entries = Object.entries(langs).filter(([, b]) => b > 0).sort((a, b) => b[1] - a[1]);
    const sum = entries.reduce((a, [, b]) => a + b, 0);
    const major = entries.filter(([, b]) => b / sum > 0.012);
    $("#langBar").innerHTML = major.map(([l, b]) => `<span title="${esc(l)} ${(b / sum * 100).toFixed(1)}%" style="flex-grow:${b};background:${GH.langColor(l)}"></span>`).join("");
    $("#langLegend").innerHTML = major.map(([l, b]) => `<li><i class="lang-dot" style="background:${GH.langColor(l)}"></i>${esc(l)} ${(b / sum * 100).toFixed(0)}%</li>`).join("");
  }

  /* ---------- about + contact ---------- */
  $("#timeline").innerHTML = P.experience.map((x) => `
    <div class="tl-item reveal"><h3>${esc(x.role)}</h3><p class="org">${esc(x.org)} · ${esc(x.period)}</p>
    <ul>${x.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`).join("");
  $("#skillGroups").innerHTML = Object.entries(P.skills).map(([g, list]) => `
    <div class="skill-group reveal"><h3>${esc(g)}</h3><div class="stack">${list.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div></div>`).join("");
  $("#certs").innerHTML = (P.certifications || []).map((c) => `<li>${esc(c)}</li>`).join("");
  $("#contactLinks").innerHTML = [
    person.email && `<a href="mailto:${esc(person.email)}">${esc(person.email)}</a>`,
    `<a href="https://github.com/${P.github}" target="_blank" rel="noopener">github.com/${P.github}</a>`,
    person.linkedin && `<a href="${esc(person.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`,
    person.resume && `<a href="${esc(person.resume)}" target="_blank" rel="noopener">Résumé (PDF)</a>`,
  ].filter(Boolean).join("");

  /* ---------- modal ---------- */
  const modal = $("#modal");
  const readmeCache = new Map();
  async function getReadme(p) {
    if (!readmeCache.has(p.repo)) readmeCache.set(p.repo, GH.readme(P.github, p.repo, p.branch || "HEAD").catch(() => null));
    return readmeCache.get(p.repo);
  }
  async function openProject(repo) {
    const p = byRepo().get(repo) || { repo, name: prettify(repo), url: `https://github.com/${P.github}/${repo}` };
    if (p.offGithub) {
      $("#modalKicker").textContent = "private project"; $("#modalTitle").textContent = p.name; $("#modalLinks").innerHTML = "";
      $("#modalBody").innerHTML = `<p>${esc(p.description)}</p><div class="stack">${p.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div><p class="mono" style="color:var(--dim)">Code isn't public yet — happy to walk through it in an interview.</p>`;
      if (!modal.open) modal.showModal(); return;
    }
    $("#modalKicker").textContent = p.kicker || (p.tags || []).join(" · ") || "project";
    $("#modalTitle").textContent = p.name;
    const live = p.live || p.homepage;
    $("#modalLinks").innerHTML = [`<a href="${esc(p.url)}" target="_blank" rel="noopener">github ↗</a>`, live && `<a href="${esc(live)}" target="_blank" rel="noopener">live app ↗</a>`,
      `<a href="#project/${esc(repo)}" data-copy>copy link to this project</a>`].filter(Boolean).join("");
    $("#modalBody").innerHTML = `<p class="mono" style="color:var(--dim)">fetching README…</p>`;
    if (!modal.open) modal.showModal();
    history.replaceState(null, "", `#project/${repo}`);
    const md = await getReadme(p);
    if (!md) { $("#modalBody").innerHTML = `<p>${esc(p.description || "No README yet.")}</p>`; return; }
    const base = `https://github.com/${P.github}/${repo}/blob/${p.branch || "HEAD"}/`;
    const raw = `https://raw.githubusercontent.com/${P.github}/${repo}/${p.branch || "HEAD"}/`;
    const html = DOMPurify.sanitize(marked.parse(md));
    const body = $("#modalBody");
    body.innerHTML = html;
    body.querySelectorAll("img").forEach((img) => { const s = img.getAttribute("src"); if (s && !/^(https?:|data:)/.test(s)) img.src = raw + s.replace(/^\.?\//, ""); });
    body.querySelectorAll("a").forEach((a) => { const h = a.getAttribute("href"); if (h && !/^(https?:|mailto:|#)/.test(h)) a.href = base + h.replace(/^\.?\//, ""); a.target = "_blank"; a.rel = "noopener"; });
    body.scrollTop = 0;
  }
  $("#modalClose").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  modal.addEventListener("close", () => history.replaceState(null, "", location.pathname));
  $("#modalLinks").addEventListener("click", (e) => {
    const a = e.target.closest("[data-copy]"); if (!a) return; e.preventDefault();
    navigator.clipboard?.writeText(location.href.split("#")[0] + a.getAttribute("href")).then(() => { a.textContent = "copied ✓"; });
  });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openProject(b.dataset.open); });
  const fromHash = () => { const m = location.hash.match(/^#project\/(.+)$/); if (m) openProject(decodeURIComponent(m[1])); };
  addEventListener("hashchange", fromHash);

  /* ---------- RAG terminal ---------- */
  const rag = new PortfolioRAG.Index();
  // the owner's name is in every question ("what has Andrew built…") — don't let it match the contact card
  PortfolioRAG.tokenize(person.name).forEach((t) => rag.ignore.add(t));
  const addDoc = (d) => rag.add(d);
  addDoc({ repo: null, title: "About", section: "Summary", text: person.summary, boost: 1.1 });
  addDoc({ repo: null, title: "About", section: "Contact", text: `You can reach ${person.name} at ${person.email}. ${person.name.split(" ")[0]} is open to full-time AI and ML engineering roles, based in ${person.location}. The code is on GitHub at github.com/${P.github}.` });
  P.experience.forEach((x) => addDoc({ repo: null, title: "Experience", section: `${x.role}, ${x.org}`, text: `${x.role} at ${x.org} (${x.period}). ${x.points.join(" ")}`, boost: 1.1 }));
  if (P.certifications) addDoc({ repo: null, title: "About", section: "Certifications", text: `Microsoft certifications: ${P.certifications.join("; ")}.` });
  addDoc({ repo: null, title: "About", section: "Skills", text: Object.entries(P.skills).map(([g, l]) => `${g} skills: ${l.join(", ")}.`).join(" ") });
  P.featured.forEach((f) => {
    addDoc({ repo: f.repo, title: f.name, section: `Overview · ${f.kicker}`, text: f.blurb, boost: 1.25 });
    addDoc({ repo: f.repo, title: f.name, section: "Highlights", text: f.highlights.map((h) => h.replace(/\.?$/, ".")).join(" ") + ` Built with ${f.stack.join(", ")}.`, boost: 1.15 });
  });
  const updateIndexInfo = () => {
    const repos = new Set(rag.docs.map((d) => d.repo).filter(Boolean));
    $("#indexInfo").textContent = `${rag.docs.length} chunks · ${repos.size} repos · BM25`;
  };
  updateIndexInfo();

  async function indexReadmes() {
    const indexed = new Set();
    await Promise.all(projects.map(async (p) => {
      if (indexed.has(p.repo)) return; indexed.add(p.repo);
      if (p.offGithub) { addDoc({ repo: p.repo, title: p.name, section: "Overview", text: `${p.name}: ${p.description}` }); return; }
      if (!p.featured && p.description) addDoc({ repo: p.repo, title: p.name, section: "Description", text: `${p.name}: ${p.description}` });
      const md = await getReadme(p);
      if (!md) return;
      PortfolioRAG.chunkReadme(p.repo, p.name, md).forEach(addDoc);
      if (!p.description) {
        const lead = PortfolioRAG.cleanMd(md.replace(/^#.*$/m, "")).split(/(?<=[.!?])\s+/).find((s) => s.length > 40);
        if (lead) { p.readmeLead = lead.length > 160 ? lead.slice(0, 157) + "…" : lead; }
      }
    }));
    updateIndexInfo();
    renderGrid();
  }

  const log = $("#termLog");
  const first = person.name.split(" ")[0];
  const SUGGEST = [`What has ${first} built with LLMs?`, "How does the GE Tycoon model work?", "Reinforcement learning experience?", "How are LLMs evaluated in the Colosseum?", "Professional experience?", `How do I contact ${first}?`];
  $("#termSuggest").innerHTML = SUGGEST.map((s) => `<button type="button">${esc(s)}</button>`).join("");
  $("#termSuggest").addEventListener("click", (e) => { if (e.target.tagName === "BUTTON") ask(e.target.textContent); });
  $("#traceToggle").addEventListener("change", (e) => log.classList.toggle("hide-trace", !e.target.checked));

  const say = (html, cls) => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  say(`<p>Hi — I'm a retrieval index over ${esc(first)}'s projects, READMEs and experience. Ask me anything about the work. Answers are quoted from the source material, with citations.</p>`, "msg-a");

  let busy = false;
  async function ask(q) {
    q = q.trim(); if (!q || busy) return;
    busy = true; $("#termQ").value = "";
    say(`&gt; ${esc(q)}`, "msg-q");
    const t0 = performance.now();
    const { sentences, hits } = PortfolioRAG.answer(rag, q);
    const ms = (performance.now() - t0).toFixed(1);
    const el = say("", "msg-a");
    if (!sentences.length) {
      el.innerHTML = `<p>Nothing in the portfolio matches that. Try asking about LLM routing, the trading model, reinforcement learning or professional experience.</p>`;
      busy = false; return;
    }
    // number sources in order of first use
    const srcOrder = [];
    const srcOf = (ci) => { const key = hits[ci].d; let n = srcOrder.indexOf(key); if (n < 0) { srcOrder.push(key); n = srcOrder.length - 1; } return n + 1; };
    const parts = sentences.map((s) => ({ text: s.s, n: srcOf(s.ci) }));
    const p = document.createElement("p"); el.appendChild(p);
    for (const part of parts) {
      const words = part.text.split(" ");
      for (let i = 0; i < words.length; i++) {
        p.append((i ? " " : "") + words[i]);
        if (i % 3 === 0) { log.scrollTop = log.scrollHeight; await new Promise((r) => setTimeout(r, 12)); }
      }
      const c = document.createElement("span"); c.className = "cite"; c.textContent = `[${part.n}]`;
      c.title = `${srcOrder[part.n - 1].title} › ${srcOrder[part.n - 1].section}`; p.append(c, " ");
    }
    const srcHtml = srcOrder.map((d, i) => d.repo
      ? `[${i + 1}] <a class="proj-link" data-open="${esc(d.repo)}">${esc(d.title)}</a> › ${esc(d.section)}`
      : `[${i + 1}] ${esc(d.title)} › ${esc(d.section)}`).join("<br>");
    const max = hits[0].s;
    const trace = hits.map((h) => `<div class="row"><span>${h.s.toFixed(2)}</span><span class="bar" style="width:${(h.s / max * 100).toFixed(0)}%"></span><span class="src">${esc(h.d.title)} › ${esc(h.d.section)}</span><span></span><span class="snip">${esc(h.d.text.slice(0, 140))}</span></div>`).join("");
    el.insertAdjacentHTML("beforeend", `<p class="mono" style="font-size:12px;color:var(--muted)">${srcHtml}</p>
      <div class="trace"><div class="head">retrieved top ${hits.length} of ${rag.docs.length} chunks in ${ms} ms · score = BM25(k1=1.2, b=0.5)</div>${trace}</div>`);
    log.scrollTop = log.scrollHeight;
    busy = false;
  }
  $("#termForm").addEventListener("submit", (e) => { e.preventDefault(); ask($("#termQ").value); });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  const observeReveals = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));

  /* ---------- boot ---------- */
  renderFeatured();
  renderChips();
  renderGrid();
  observeReveals();
  fromHash();

  GH.load(P.github).then((data) => {
    mergeRepos(data.repos);
    renderStats(data);
    fillFeaturedMeta();
    renderGrid();
    window.SkillGraph($("#graphCanvas"), $("#graphTip"), { projects, onOpen: openProject });
    indexReadmes();
  });
})();
