/*
 * Everything you'd normally edit lives in this file.
 *
 * Adding a future project:
 *   1. Push it to GitHub as a public repo. It shows up on the site automatically:
 *      card, skill-graph node, and searchable by the "Ask my portfolio" assistant.
 *      Add the topic "portfolio" to the repo to give it a "new" badge and more weight.
 *   2. (Optional) Add an entry to `featured` below for a custom write-up,
 *      highlights and a visual.
 *   3. Projects that aren't on GitHub go in `offGithub`.
 */
window.PORTFOLIO = {
  github: "andrewshooman",

  person: {
    name: "Andrew Shooman",
    title: "AI Engineer",
    location: "Charlotte, NC · Remote (US)",
    email: "andrewshooman@gmail.com",
    linkedin: "https://www.linkedin.com/in/andrew-shooman",
    resume: "",   // e.g. "resume.pdf" (drop the file next to index.html)
    taglines: [
      "I build ML systems that make real decisions.",
      "Local models first. Cloud only when it earns it.",
      "Every GPU cycle accounted for.",
      "From hourly market data to LightGBM to a RuneLite plugin.",
      "Models that author strategies. Engines that judge them.",
      "Lifelong gamer, so most of my projects end up in games.",
    ],
    summary:
      "Senior Data & AI consultant at EY. I turn complex business problems into Azure-native " +
      "pipelines, analytics and production ML, with measured results across government, media " +
      "and finance. Outside work I'm a lifelong gamer, and a lot of my side projects are where " +
      "games and AI meet. I'd rather run models on my own hardware than rent them from the " +
      "cloud: local LLMs, quantization and GPU tuning to get everything out of the machine on my desk.",
  },

  // Hero stats. `value` is shown as written; keep them accurate.
  // GitHub project count and last push are added live.
  heroStats: [
    { label: "client savings", value: "~$90M" },
    { label: "yrs data & AI", value: "4+" },
  ],

  experience: [
    {
      role: "Senior Consultant, Data & AI",
      org: "Ernst & Young LLP · Charlotte, NC",
      period: "Aug 2024 – Present",
      points: [
        "~$90M saved: built predictive-maintenance ML models that extend HVAC fleet lifespan for a government client.",
        "New revenue lever: engineered watch-time analytics that generate household activity scores for a broadcast company.",
        "Led delivery for a blended onshore/offshore team, owning client demos and AI adoption roadmaps.",
        "Mentor junior consultants on data engineering and Azure best practices.",
      ],
    },
    {
      role: "Staff Consultant, Data & AI",
      org: "Ernst & Young LLP · Charlotte, NC",
      period: "Aug 2022 – Aug 2024",
      points: [
        "Delivered Azure data pipelines and Power BI dashboards across multiple industries.",
        "Automated reporting with Python services and APIs, cutting manual effort.",
        "Built an internal proof-of-concept using Azure Video Indexer to auto-summarize bodycam footage.",
        "Cut cost and runtime by optimizing Databricks and Synapse workloads.",
      ],
    },
    {
      role: "Technology Intern",
      org: "Wells Fargo · Charlotte, NC",
      period: "Summers 2020 & 2021",
      points: [
        "Automated dataset archival and retrieval with Python and Jenkins pipelines.",
        "Validated risk models (CAPM, CCAR) through testing and debugging.",
        "Built an auto-updater for seamless Conda package deploys in production.",
      ],
    },
    {
      role: "B.S., Computer Science · Statistics & Analytics",
      org: "UNC at Chapel Hill",
      period: "2021",
      points: [
        "1st place, Carolina Data Science Challenge.",
        "2nd place, NC State Data Science Competition.",
      ],
    },
  ],

  certifications: [
    "DP-203 · Azure Data Engineer Associate",
    "PL-300 · Power BI Data Analyst",
    "AI-900 · AZ-900 · DP-900 · PL-900",
  ],

  skills: {
    "AI / ML": ["LightGBM", "Scikit-learn", "TensorFlow", "PyTorch", "PPO / RL (RLGym)", "MLflow", "Azure ML", "Walk-forward backtesting"],
    "LLM systems": ["Ollama", "LangChain", "Claude / OpenAI / Gemini APIs", "Model routing", "Agent loops", "Prompt + output validation"],
    "Local hardware": ["Local LLM inference", "Quantization & KV-cache tuning", "AMD GPU (Vulkan) builds", "whisper.cpp", "Raspberry Pi"],
    "Data": ["Python", "SQL", "Spark", "Databricks", "Data Factory", "Synapse", "Snowflake", "PostgreSQL", "Power BI / DAX"],
    "Engineering": ["Java", "JavaScript", "Rust", "FastAPI", "Docker", "Azure DevOps / CI-CD", "GitHub Actions"],
  },

  // Projects that don't have a public repo (yet). Shown in the grid without a code link.
  offGithub: [
    {
      repo: "multi-agent-orchestrator",
      name: "Multi-Agent AI Orchestrator",
      description: "React/Node app that routes tasks across local and cloud LLMs, with caching, streaming and token budgeting.",
      tags: ["ai", "llm", "web"],
      skills: ["JavaScript", "React", "Node", "Ollama"],
    },
    {
      repo: "pi-assistant",
      name: "Home-Brew Raspberry Pi AI",
      description: "Self-hosted local AI assistant with persistent memory and a self-improving agent loop.",
      tags: ["ai", "llm"],
      skills: ["Python", "Raspberry Pi", "Ollama"],
    },
  ],

  // Display names for repos whose names don't prettify well.
  names: {
    "ge-tycoon": "GE Tycoon · RuneLite plugin",
    "COMP562Final": "COMP 562 · Machine Learning final",
    "epl-golf": "EPL Prediction Golf",
  },

  // Repos to hide from the "All projects" grid.
  hidden: ["MainHub", "my-angular-app", "angular-cli", "rlStats", "plugin-hub", "nicole-portfolio"],

  /*
   * Featured projects. `repo` must match the GitHub repo name.
   * `visual` picks the animated illustration (see js/visuals.js):
   *   market | arena | router | rl | radar | generic
   */
  featured: [
    {
      repo: "osrs-flipper",
      name: "GE Tycoon",
      kicker: "Applied ML · trading system",
      visual: "market",
      live: "https://andrewshooman.github.io/osrs-flipper/",
      blurb:
        "An ML trading assistant for Old School RuneScape's Grand Exchange. LightGBM models " +
        "predict fill probability, post-tax return, round-trip time and 4h/12h return quantiles " +
        "for ~3,400 items, then size orders against your stack. A paper-trading bot runs the " +
        "same model against the live market around the clock.",
      highlights: [
        "42 leak-free features per item per hour from a year of hourly + 60 days of 5-min data",
        "Year-long walk-forward backtest; realistic 5-minute fill replay",
        "Shipped as a web app and a Java RuneLite plugin (ge-tycoon)",
      ],
      metrics: [
        { label: "items modeled", value: "3,400" },
        { label: "features", value: "42" },
        { label: "bot, gp/day", value: "+133k" },
      ],
      stack: ["Python", "LightGBM", "JavaScript", "Java", "GitHub Pages"],
      tags: ["ml", "data", "web"],
    },
    {
      repo: "ai-colosseum",
      name: "AI Colosseum",
      kicker: "LLM evaluation · agents",
      visual: "arena",
      blurb:
        "An arena where language models compete by writing strategy. Each model authors a " +
        "ruleset in a small safe DSL; a deterministic engine runs the fight. Results are " +
        "objective and reproducible — no model can cheat the game loop — and feed an Elo ladder.",
      highlights: [
        "Whitelisted DSL parser + interpreter (no eval) with repair prompts for invalid output",
        "Pluggable providers: local Ollama, Anthropic, OpenAI, OpenRouter, offline house bots",
        "FastAPI + SQLite with replays and Elo ratings",
      ],
      metrics: [
        { label: "API calls / bout", value: "1" },
        { label: "providers", value: "5" },
        { label: "arena", value: "12×12" },
      ],
      stack: ["Python", "FastAPI", "Ollama", "Claude API", "SQLite"],
      tags: ["llm", "ai"],
    },
    {
      repo: "smartroute-ai",
      name: "SmartRoute AI",
      kicker: "LLM infra · cost routing",
      visual: "router",
      blurb:
        "A local-first chat router that saves cloud tokens. A local judge model decides where " +
        "each prompt goes; easy ones stay on Ollama, hard or low-confidence ones escalate to " +
        "Gemini. Every call is logged so you can see which model handled what.",
      highlights: [
        "Auto / local-only / cloud-only modes with a local routing judge",
        "Quality-based fallback escalation",
        "Persistent SQLite memory and per-call router logs",
      ],
      metrics: [
        { label: "routing modes", value: "3" },
        { label: "default path", value: "local" },
      ],
      stack: ["Python", "LangChain", "Ollama", "Gemini", "Streamlit"],
      tags: ["llm", "ai"],
    },
    {
      repo: "sushi-bot-rl",
      name: "Sushi Bot",
      kicker: "Reinforcement learning",
      visual: "rl",
      blurb:
        "A Rocket League bot trained with PPO on RLGym and RocketSim. Custom 116-feature " +
        "normalized observation space, a 19-action discrete action parser, training presets " +
        "and checkpoint tooling, with RLViser for watching training live.",
      highlights: [
        "116-feature observation builder (car physics, ball, boost pads)",
        "19 discrete actions covering core mechanics",
        "Rust + Python; checkpoint standardization tools",
      ],
      metrics: [
        { label: "obs features", value: "116" },
        { label: "actions", value: "19" },
        { label: "algorithm", value: "PPO" },
      ],
      stack: ["Python", "PyTorch", "RLGym-PPO", "Rust"],
      tags: ["ml", "ai", "games"],
    },
    {
      repo: "talisman",
      name: "TALISMAN",
      kicker: "Game systems · procedural art",
      visual: "radar",
      blurb:
        "A single-player football career RPG. Simulated league pyramid with promotion and " +
        "relegation, stat-driven key moments, an age curve, injuries and a weighted legacy " +
        "score — all procedural SVG art, no build step, mobile-first.",
      highlights: [
        "Full season sim across a four-division pyramid",
        "Seeded RNG, daily challenge, Hall of Fame",
        "Procedural SVG crests, kits, radars and charts",
      ],
      metrics: [
        { label: "divisions", value: "4" },
        { label: "build step", value: "none" },
      ],
      stack: ["JavaScript", "SVG", "CSS"],
      tags: ["games", "web"],
    },
  ],
};
