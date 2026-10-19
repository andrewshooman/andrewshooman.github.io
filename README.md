# andrewshooman.github.io

Personal portfolio: https://andrewshooman.github.io

Static site, no build step. Project data is pulled live from the GitHub API, with a
daily snapshot (`data/github.json`) refreshed by `.github/workflows/sync.yml`.

- Edit content in `data/profile.js`.
- New public repos appear automatically; tag one `portfolio` to spotlight it.
- Run locally: `python -m http.server` and open http://localhost:8000.
