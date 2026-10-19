// Writes data/github.json: the fallback the site uses when a visitor's
// GitHub API rate limit is exhausted. Run by .github/workflows/sync.yml daily.
//   node scripts/snapshot.mjs <github-user>
import { writeFile, mkdir } from "node:fs/promises";

const user = process.argv[2] || process.env.GH_USER;
const headers = { Accept: "application/vnd.github+json", "User-Agent": "portfolio-snapshot" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const get = async (url) => {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

const repos = (await get(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`)).filter((r) => !r.fork);
const out = [];
for (const r of repos) {
  out.push({
    name: r.name, description: r.description || "", language: r.language,
    languages: await get(r.languages_url).catch(() => ({})),
    stars: r.stargazers_count, fork: r.fork, topics: r.topics || [], url: r.html_url,
    homepage: r.homepage || "", pushed: r.pushed_at, created: r.created_at, branch: r.default_branch,
  });
}
await mkdir("data", { recursive: true });
await writeFile("data/github.json", JSON.stringify({ fetchedAt: Date.now(), repos: out }, null, 1));
console.log(`snapshot: ${out.length} repos`);
