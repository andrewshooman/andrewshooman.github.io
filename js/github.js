/*
 * GitHub data layer.
 * Order of preference: fresh localStorage cache -> live GitHub API -> data/github.json
 * (a snapshot the GitHub Action refreshes daily, so the site still works when the
 * visitor is rate-limited or offline).
 */
(function () {
  const API = "https://api.github.com";
  const CACHE_KEY = "gh-portfolio-v1";
  const TTL = 60 * 60 * 1000; // 1 hour

  const readCache = () => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && Date.now() - c.fetchedAt < TTL) return c;
    } catch (_) {}
    return null;
  };
  const writeCache = (data) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
  };

  async function getJSON(url) {
    const r = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }

  const shape = (r, languages) => ({
    name: r.name,
    description: r.description || "",
    language: r.language,
    languages: languages || {},
    stars: r.stargazers_count,
    fork: r.fork,
    topics: r.topics || [],
    url: r.html_url,
    homepage: r.homepage || "",
    pushed: r.pushed_at,
    created: r.created_at,
    branch: r.default_branch,
  });

  async function fromApi(user) {
    const raw = await getJSON(`${API}/users/${user}/repos?per_page=100&sort=pushed`);
    const own = raw.filter((r) => !r.fork);
    const langs = await Promise.all(
      own.map((r) => getJSON(r.languages_url).catch(() => ({})))
    );
    return { fetchedAt: Date.now(), source: "live", repos: own.map((r, i) => shape(r, langs[i])) };
  }

  async function fromSnapshot() {
    const r = await fetch("data/github.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("no snapshot");
    const d = await r.json();
    return { ...d, source: "snapshot" };
  }

  async function load(user) {
    const cached = readCache();
    if (cached) return { ...cached, source: "cache" };
    try {
      const live = await fromApi(user);
      writeCache(live);
      return live;
    } catch (e) {
      console.warn("GitHub API unavailable, using snapshot:", e.message);
      try { return await fromSnapshot(); } catch (_) { return { fetchedAt: 0, source: "none", repos: [] }; }
    }
  }

  async function readme(user, repo, branch = "HEAD") {
    for (const f of ["README.md", "readme.md"]) {
      const r = await fetch(`https://raw.githubusercontent.com/${user}/${repo}/${branch}/${f}`);
      if (r.ok) return r.text();
    }
    return null;
  }

  // GitHub linguist colours for the languages that show up here.
  const LANG_COLORS = {
    Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6", Java: "#b07219",
    Rust: "#dea584", HTML: "#e34c26", CSS: "#663399", TeX: "#3D6117", R: "#198CE7",
    Shell: "#89e051", Batchfile: "#C1F12E", Dockerfile: "#384d54", "Jupyter Notebook": "#DA5B0B",
    Go: "#00ADD8", "C++": "#f34b7d", C: "#555555", "C#": "#178600", Kotlin: "#A97BFF",
  };
  const langColor = (l) => LANG_COLORS[l] || "#8b97a6";

  window.GH = { load, readme, langColor };
})();
