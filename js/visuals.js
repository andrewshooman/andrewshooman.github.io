/*
 * Canvas sketches. Each visual is a small simulation of what the project does,
 * not a screenshot. They only animate while on screen.
 */
(function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const css = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n) => s.getPropertyValue(n).trim();
    return { bg: v("--bg-2"), line: v("--line"), line2: v("--line-2"), text: v("--text"), muted: v("--muted"),
             dim: v("--dim"), acc: v("--acc"), acc2: v("--acc-2"), acc3: v("--acc-3"), mono: v("--mono") };
  };
  let C = css();
  window.addEventListener("themechange", () => { C = css(); });

  const alpha = (hex, a) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // Seeded RNG so every visit tells the same story.
  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  /** Wire a canvas to a draw(ctx, w, h, t, dt) loop, sized to its box, paused off-screen. */
  function mount(canvas, factory) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, visible = false, raf = 0, last = 0, t = 0;
    const sketch = factory();
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sketch.resize && sketch.resize(w, h);
      if (!visible || reduced) sketch.draw(ctx, w, h, t, 0);
    };
    const frame = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now; t += dt;
      sketch.draw(ctx, w, h, t, dt);
      if (visible && !reduced) raf = requestAnimationFrame(frame);
    };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduced) { last = 0; raf = requestAnimationFrame(frame); }
    }).observe(canvas);
    window.addEventListener("themechange", () => sketch.draw(ctx, w, h, t, 0));
    return sketch;
  }

  const label = (ctx, txt, x, y, color, size = 11, align = "left") => {
    ctx.font = `${size}px ${C.mono}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(txt, x, y);
  };

  /* ---------------- hero: a feed-forward net that reacts to the cursor ---------------- */
  function hero(canvas) {
    const mouse = { x: -999, y: -999 };
    addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    return mount(canvas, () => {
      const R = rng(7);
      const layers = [6, 10, 12, 10, 5];
      let nodes = [], edges = [], pulses = [];
      return {
        resize(w, h) {
          nodes = []; edges = [];
          const x0 = w < 760 ? w * 0.1 : w * 0.42, x1 = w * 0.94;
          layers.forEach((n, li) => {
            const x = x0 + (x1 - x0) * (li / (layers.length - 1));
            const span = h * 0.7, y0 = (h - span) / 2;
            for (let i = 0; i < n; i++) {
              nodes.push({ x: x + (R() - 0.5) * 30, y: y0 + span * ((i + 0.5) / n) + (R() - 0.5) * 20, l: li, a: 0, ph: R() * 6.28 });
            }
          });
          const byLayer = (l) => nodes.filter((n) => n.l === l);
          for (let l = 0; l < layers.length - 1; l++) {
            const A = byLayer(l), B = byLayer(l + 1);
            A.forEach((a) => B.forEach((b) => { if (R() < 0.55) edges.push({ a, b, wgt: R() }); }));
          }
        },
        draw(ctx, w, h, t, dt) {
          ctx.clearRect(0, 0, w, h);
          // spontaneous + cursor-driven activations on the input side
          if (R() < dt * 2.2) {
            const ins = nodes.filter((n) => n.l === 0);
            ins[Math.floor(R() * ins.length)].a = 1;
          }
          nodes.forEach((n) => {
            const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
            if (d < 110) n.a = Math.min(1, n.a + dt * 4 * (1 - d / 110));
            if (n.a > 0.85 && !n.fired) {
              n.fired = true;
              edges.filter((e) => e.a === n && e.wgt > 0.35).forEach((e) => pulses.push({ e, p: 0, s: 0.6 + R() * 0.8 }));
            }
            if (n.a < 0.3) n.fired = false;
            n.a = Math.max(0, n.a - dt * 0.9);
          });
          // edges
          edges.forEach((e) => {
            const act = Math.max(e.a.a, e.b.a);
            ctx.strokeStyle = alpha(C.line2, 0.25 + act * 0.5);
            ctx.lineWidth = 0.6 + e.wgt * 0.6;
            ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
          });
          // pulses
          pulses = pulses.filter((p) => {
            p.p += dt * p.s;
            if (p.p >= 1) { p.e.b.a = Math.min(1, p.e.b.a + 0.5 + p.e.wgt * 0.4); return false; }
            const x = p.e.a.x + (p.e.b.x - p.e.a.x) * p.p, y = p.e.a.y + (p.e.b.y - p.e.a.y) * p.p;
            ctx.fillStyle = C.acc; ctx.shadowColor = C.acc; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
            return true;
          });
          // nodes
          nodes.forEach((n) => {
            const col = n.l === 0 ? C.acc2 : n.l === layers.length - 1 ? C.acc3 : C.acc;
            const r = 3.2 + n.a * 3 + Math.sin(t * 2 + n.ph) * 0.4;
            if (n.a > 0.05) { ctx.fillStyle = alpha(col, n.a * 0.18); ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, 7); ctx.fill(); }
            ctx.fillStyle = n.a > 0.1 ? col : C.bg;
            ctx.strokeStyle = alpha(col, 0.5 + n.a * 0.5); ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.fill(); ctx.stroke();
          });
        },
      };
    });
  }

  /* ---------------- GE Tycoon: price stream, model buys/sells, forecast band ---------------- */
  const market = () => {
    const R = rng(42);
    let pts = [], mean = 100, v = 100, acc = 0, trades = [], pnl = 0;
    const step = () => {
      v += (mean - v) * 0.06 + (R() - 0.5) * 3.4;
      if (R() < 0.01) mean += (R() - 0.5) * 18;
      pts.push(v);
    };
    for (let i = 0; i < 160; i++) step();
    return {
      draw(ctx, w, h, t, dt) {
        acc += dt * 9;
        while (acc > 1) { acc--; step(); pts.shift(); trades.forEach((tr) => tr.i--); trades = trades.filter((tr) => tr.i > -2);
          const n = pts.length - 1, win = pts.slice(-20), lo = Math.min(...win), hi = Math.max(...win);
          const open = trades.find((tr) => tr.side === "buy" && !tr.closed);
          if (!open && pts[n] <= lo + 0.4 && R() < 0.5) trades.push({ i: n, side: "buy", p: pts[n] });
          if (open && pts[n] >= hi - 0.4 && pts[n] > open.p * 1.02) { open.closed = true; trades.push({ i: n, side: "sell", p: pts[n] }); pnl += (pts[n] * 0.98 - open.p); }
        }
        ctx.clearRect(0, 0, w, h);
        const pad = { l: 16, r: w * 0.26, t: 40, b: 46 };
        const min = Math.min(...pts) - 6, max = Math.max(...pts) + 6;
        const X = (i) => pad.l + (i / (pts.length - 1)) * (w - pad.l - pad.r);
        const Y = (p) => pad.t + (1 - (p - min) / (max - min)) * (h - pad.t - pad.b);
        // grid
        ctx.strokeStyle = alpha(C.line2, 0.35); ctx.lineWidth = 1;
        for (let g = 0; g < 5; g++) { const y = pad.t + g * (h - pad.t - pad.b) / 4; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - 12, y); ctx.stroke(); }
        // forecast cone (4h / 12h quantiles)
        const lx = X(pts.length - 1), ly = Y(pts[pts.length - 1]), fx = w - 18;
        const drift = (mean - pts[pts.length - 1]) * 0.5;
        ctx.fillStyle = alpha(C.acc2, 0.12);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, Y(pts.at(-1) + drift + 12)); ctx.lineTo(fx, Y(pts.at(-1) + drift - 12)); ctx.closePath(); ctx.fill();
        ctx.fillStyle = alpha(C.acc2, 0.2);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, Y(pts.at(-1) + drift + 5)); ctx.lineTo(fx, Y(pts.at(-1) + drift - 5)); ctx.closePath(); ctx.fill();
        ctx.setLineDash([4, 4]); ctx.strokeStyle = C.acc2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, Y(pts.at(-1) + drift)); ctx.stroke(); ctx.setLineDash([]);
        label(ctx, "q10–q90", fx, Y(pts.at(-1) + drift + 12) - 6, C.acc2, 10, "right");
        // price line
        const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
        grad.addColorStop(0, alpha(C.acc, 0.22)); grad.addColorStop(1, alpha(C.acc, 0));
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(i), Y(p)) : ctx.moveTo(X(i), Y(p))));
        ctx.strokeStyle = C.acc; ctx.lineWidth = 2; ctx.stroke();
        ctx.lineTo(X(pts.length - 1), h - pad.b); ctx.lineTo(X(0), h - pad.b); ctx.fillStyle = grad; ctx.fill();
        // trades
        trades.forEach((tr) => {
          if (tr.i < 0) return;
          const x = X(tr.i), y = Y(tr.p), up = tr.side === "buy";
          ctx.fillStyle = up ? C.acc2 : C.acc3;
          ctx.beginPath();
          if (up) { ctx.moveTo(x, y + 6); ctx.lineTo(x - 6, y + 16); ctx.lineTo(x + 6, y + 16); }
          else { ctx.moveTo(x, y - 6); ctx.lineTo(x - 6, y - 16); ctx.lineTo(x + 6, y - 16); }
          ctx.fill();
          label(ctx, up ? "BUY" : "SELL", x, up ? y + 28 : y - 20, up ? C.acc2 : C.acc3, 9, "center");
        });
        ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 7); ctx.fillStyle = C.acc; ctx.fill();
        // HUD
        const pf = (0.55 + 0.35 * Math.abs(Math.sin(t * 0.7))).toFixed(2);
        label(ctx, `p(fill) ${pf}   E[ret|tax] ${(drift / 40 * 100).toFixed(1)}%   paper P&L ${pnl >= 0 ? "+" : ""}${(pnl * 1.3).toFixed(0)}k`, 16, h - 18, C.muted, 11);
      },
    };
  };

  /* ---------------- AI Colosseum: two rulesets fight on a 12x12 grid ---------------- */
  const arena = () => {
    const R = rng(3), N = 12;
    const rulesA = ["dist<=1 && energy>10 → attack", "energy<18 → move_to energy", "true → move_toward enemy"];
    const rulesB = ["hp<30 → retreat", "dist<=1 → attack", "true → flank enemy"];
    let A, B, cells, tick, acc, flash, winner, rest;
    const reset = () => {
      A = { x: 1, y: 2, hp: 100, en: 30, col: "acc", rules: rulesA, fired: 0, name: "claude-ruleset" };
      B = { x: 10, y: 9, hp: 100, en: 30, col: "acc3", rules: rulesB, fired: 0, name: "llama-ruleset" };
      cells = []; tick = 0; acc = 0; flash = 0; winner = null; rest = 0;
      for (let i = 0; i < 5; i++) cells.push({ x: Math.floor(R() * N), y: Math.floor(R() * N) });
    };
    reset();
    const toward = (s, tx, ty, away) => {
      const dx = Math.sign(tx - s.x) * (away ? -1 : 1), dy = Math.sign(ty - s.y) * (away ? -1 : 1);
      if (Math.abs(tx - s.x) > Math.abs(ty - s.y) ? dx : !dy) s.x = Math.max(0, Math.min(N - 1, s.x + dx));
      else s.y = Math.max(0, Math.min(N - 1, s.y + dy));
    };
    const act = (s, o) => {
      const d = Math.abs(s.x - o.x) + Math.abs(s.y - o.y);
      s.en = Math.max(0, s.en - 1);
      if (s === A) {
        if (d <= 1 && s.en > 10) { s.fired = 0; o.hp -= 9 + R() * 6; s.en -= 6; flash = 1; }
        else if (s.en < 18 && cells.length) { s.fired = 1; const c = cells.reduce((m, c) => (Math.abs(c.x - s.x) + Math.abs(c.y - s.y) < Math.abs(m.x - s.x) + Math.abs(m.y - s.y) ? c : m)); toward(s, c.x, c.y); }
        else { s.fired = 2; toward(s, o.x, o.y); }
      } else {
        if (s.hp < 30 && d < 4) { s.fired = 0; toward(s, o.x, o.y, true); }
        else if (d <= 1) { s.fired = 1; o.hp -= 7 + R() * 9; flash = 1; }
        else { s.fired = 2; toward(s, o.x + (R() < 0.5 ? 1 : -1), o.y); }
      }
      cells = cells.filter((c) => { if (c.x === s.x && c.y === s.y) { s.en += 14; return false; } return true; });
    };
    return {
      draw(ctx, w, h, t, dt) {
        acc += dt;
        if (winner) { rest += dt; if (rest > 2.2) reset(); }
        else while (acc > 0.32) {
          acc -= 0.32; tick++;
          act(A, B); if (B.hp > 0) act(B, A);
          if (R() < 0.18 && cells.length < 6) cells.push({ x: Math.floor(R() * N), y: Math.floor(R() * N) });
          if (A.hp <= 0 || B.hp <= 0 || tick > 220) winner = A.hp >= B.hp ? A : B;
        }
        flash = Math.max(0, flash - dt * 4);
        ctx.clearRect(0, 0, w, h);
        const side = Math.min(h - 80, w * 0.56), cs = side / N, ox = 18, oy = (h - side) / 2;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          ctx.fillStyle = (i + j) % 2 ? alpha(C.line, 0.5) : alpha(C.line, 0.25);
          ctx.fillRect(ox + i * cs, oy + j * cs, cs - 1, cs - 1);
        }
        cells.forEach((c) => { ctx.fillStyle = C.acc2; ctx.beginPath(); ctx.arc(ox + (c.x + 0.5) * cs, oy + (c.y + 0.5) * cs, cs * 0.16, 0, 7); ctx.fill(); });
        [A, B].forEach((s) => {
          const x = ox + (s.x + 0.5) * cs, y = oy + (s.y + 0.5) * cs, col = C[s.col];
          if (flash > 0) { ctx.strokeStyle = alpha(C.text, flash); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, cs * (0.6 + (1 - flash) * 0.4), 0, 7); ctx.stroke(); }
          ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12;
          ctx.fillRect(x - cs * 0.32, y - cs * 0.32, cs * 0.64, cs * 0.64); ctx.shadowBlur = 0;
        });
        // panel: rulesets + which rule fired
        const px = ox + side + 22, pw = w - px - 16;
        [A, B].forEach((s, k) => {
          const y0 = oy + k * (side / 2 + 4);
          label(ctx, s.name, px, y0 + 10, C[s.col], 12);
          ctx.fillStyle = alpha(C.line2, 0.6); ctx.fillRect(px, y0 + 18, pw, 5);
          ctx.fillStyle = C[s.col]; ctx.fillRect(px, y0 + 18, pw * Math.max(0, s.hp) / 100, 5);
          label(ctx, `hp ${Math.max(0, s.hp).toFixed(0)}  energy ${s.en}`, px, y0 + 38, C.dim, 10);
          s.rules.forEach((r, i) => {
            const on = s.fired === i && !winner;
            const max = Math.floor(pw / 6.4);
            label(ctx, (on ? "▶ " : "  ") + (r.length > max ? r.slice(0, max - 1) + "…" : r), px, y0 + 58 + i * 16, on ? C.text : C.dim, 10);
          });
        });
        label(ctx, winner ? `winner: ${winner.name}  ·  Elo updated` : `tick ${tick}  ·  deterministic engine`, 18, h - 14, winner ? C.acc : C.muted, 11);
      },
    };
  };

  /* ---------------- SmartRoute: a local judge splits traffic ---------------- */
  const router = () => {
    const R = rng(11);
    let packets = [], acc = 0, local = 0, cloud = 0;
    const prompts = ["summarize this", "regex for emails", "refactor module", "prove theorem", "translate", "plan migration", "fix typo", "design schema"];
    return {
      draw(ctx, w, h, t, dt) {
        acc += dt;
        if (acc > 0.55) { acc = 0; const hard = R() < 0.28; packets.push({ p: 0, hard, txt: prompts[Math.floor(R() * prompts.length)], y0: 0.2 + R() * 0.6 }); }
        ctx.clearRect(0, 0, w, h);
        const J = { x: w * 0.45, y: h * 0.5 }, L = { x: w * 0.86, y: h * 0.3 }, Cl = { x: w * 0.86, y: h * 0.72 };
        // wires
        ctx.strokeStyle = alpha(C.line2, 0.7); ctx.lineWidth = 1.5;
        [[L, C.acc], [Cl, C.acc2]].forEach(([n]) => { ctx.beginPath(); ctx.moveTo(J.x, J.y); ctx.bezierCurveTo((J.x + n.x) / 2, J.y, (J.x + n.x) / 2, n.y, n.x, n.y); ctx.stroke(); });
        // judge
        ctx.save(); ctx.translate(J.x, J.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = C.bg; ctx.strokeStyle = C.text; ctx.lineWidth = 1.5; ctx.fillRect(-20, -20, 40, 40); ctx.strokeRect(-20, -20, 40, 40); ctx.restore();
        label(ctx, "judge", J.x, J.y + 4, C.text, 11, "center");
        label(ctx, "local llm decides route", J.x, J.y + 48, C.dim, 10, "center");
        // endpoints
        const node = (n, title, sub, col, count) => {
          ctx.fillStyle = alpha(col, 0.12); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(n.x - 64, n.y - 26, 128, 52, 10); ctx.fill(); ctx.stroke();
          label(ctx, title, n.x, n.y - 4, col, 12, "center");
          label(ctx, `${sub} · ${count}`, n.x, n.y + 13, C.muted, 10, "center");
        };
        node(L, "ollama", "local", C.acc, local); node(Cl, "gemini", "cloud", C.acc2, cloud);
        // packets
        packets = packets.filter((k) => {
          k.p += dt * 0.42;
          let x, y;
          if (k.p < 0.5) { const q = k.p / 0.5; x = 14 + (J.x - 34) * q; y = h * k.y0 + (J.y - h * k.y0) * q * q; }
          else {
            const q = (k.p - 0.5) / 0.5, n = k.hard ? Cl : L, e = 1 - Math.pow(1 - q, 2);
            const mx = (J.x + n.x) / 2, u = 1 - e;
            x = u * u * u * J.x + 3 * u * u * e * mx + 3 * u * e * e * mx + e * e * e * n.x;
            y = u * u * u * J.y + 3 * u * u * e * J.y + 3 * u * e * e * n.y + e * e * e * n.y;
          }
          if (k.p >= 1) { k.hard ? cloud++ : local++; return false; }
          const col = k.p < 0.5 ? C.muted : k.hard ? C.acc2 : C.acc;
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
          if (k.p < 0.42) label(ctx, k.txt, x + 8, y - 6, C.dim, 9);
          return true;
        });
        const tot = local + cloud || 1;
        label(ctx, `handled locally ${(local / tot * 100).toFixed(0)}%   ·   cloud tokens avoided ≈ ${(local * 640).toLocaleString()}`, 16, h - 16, C.muted, 11);
      },
    };
  };

  /* ---------------- Sushi Bot: PPO agent chases ball, reward curve climbs ---------------- */
  const rl = () => {
    const R = rng(99);
    let car, ball, trail, ep = 0, rewards = [], epR = 0, timer = 0, skill = 0.15;
    const reset = () => {
      car = { x: 0.2 + R() * 0.2, y: 0.3 + R() * 0.4, a: R() * 6.28, v: 0 };
      ball = { x: 0.45 + R() * 0.2, y: 0.25 + R() * 0.5, vx: 0, vy: 0 };
      trail = []; epR = 0; timer = 0;
    };
    reset();
    for (let i = 0; i < 40; i++) rewards.push(-0.4 + i * 0.012 + (R() - 0.5) * 0.4);
    return {
      draw(ctx, w, h, t, dt) {
        const fh = h * 0.62, fw = w - 32, ox = 16, oy = 34;
        // policy: steer toward a point behind the ball (lined up with goal), with noise that shrinks as skill grows
        const gx = 1, gy = 0.5;
        const tx = ball.x - (gx - ball.x) * 0.06, ty = ball.y - (gy - ball.y) * 0.06;
        const want = Math.atan2(ty - car.y, tx - car.x) + (R() - 0.5) * (1 - skill) * 2.2;
        let da = ((want - car.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        car.a += Math.max(-4 * dt, Math.min(4 * dt, da));
        car.v = Math.min(0.42, car.v + dt * 0.5);
        car.x += Math.cos(car.a) * car.v * dt; car.y += Math.sin(car.a) * car.v * dt * (fw / fh);
        car.x = Math.max(0.02, Math.min(0.98, car.x)); car.y = Math.max(0.04, Math.min(0.96, car.y));
        if (Math.hypot((car.x - ball.x) * fw, (car.y - ball.y) * fh) < 14) {
          ball.vx = Math.cos(car.a) * 0.6; ball.vy = Math.sin(car.a) * 0.6; epR += 0.3;
        }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt * (fw / fh); ball.vx *= 0.985; ball.vy *= 0.985;
        if (ball.y < 0.03 || ball.y > 0.97) ball.vy *= -1;
        if (ball.x < 0.02) ball.vx *= -1;
        trail.push([car.x, car.y]); if (trail.length > 60) trail.shift();
        timer += dt; epR -= dt * 0.05;
        const scored = ball.x > 0.98 && ball.y > 0.35 && ball.y < 0.65;
        if (scored || timer > 7 || ball.x > 0.99) {
          if (scored) epR += 1;
          rewards.push(epR); if (rewards.length > 80) rewards.shift();
          ep++; skill = Math.min(0.92, skill + 0.012); reset();
        }
        ctx.clearRect(0, 0, w, h);
        // field
        ctx.strokeStyle = alpha(C.line2, 0.9); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(ox, oy, fw, fh, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox + fw / 2, oy); ctx.lineTo(ox + fw / 2, oy + fh); ctx.stroke();
        ctx.beginPath(); ctx.arc(ox + fw / 2, oy + fh / 2, fh * 0.16, 0, 7); ctx.stroke();
        ctx.fillStyle = alpha(C.acc3, 0.25); ctx.fillRect(ox + fw - 6, oy + fh * 0.35, 6, fh * 0.3);
        // trail + car + ball
        trail.forEach(([x, y], i) => { ctx.fillStyle = alpha(C.acc, i / trail.length * 0.5); ctx.fillRect(ox + x * fw - 1.5, oy + y * fh - 1.5, 3, 3); });
        ctx.save(); ctx.translate(ox + car.x * fw, oy + car.y * fh); ctx.rotate(car.a);
        ctx.fillStyle = C.acc; ctx.shadowColor = C.acc; ctx.shadowBlur = 10; ctx.fillRect(-9, -5, 18, 10); ctx.shadowBlur = 0; ctx.restore();
        ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(ox + ball.x * fw, oy + ball.y * fh, 6, 0, 7); ctx.fill();
        label(ctx, `episode ${ep}  ·  obs 116  ·  actions 19`, ox, 22, C.muted, 11);
        // reward curve
        const cy = oy + fh + 18, ch = h - cy - 26;
        label(ctx, "mean episode reward", ox, cy + 2, C.dim, 10);
        const sm = rewards.map((_, i) => { const s = rewards.slice(Math.max(0, i - 6), i + 1); return s.reduce((a, b) => a + b, 0) / s.length; });
        const mn = Math.min(...sm) - 0.1, mx = Math.max(...sm) + 0.1;
        ctx.beginPath();
        sm.forEach((r, i) => { const x = ox + (i / (sm.length - 1)) * fw, y = cy + 10 + (1 - (r - mn) / (mx - mn)) * ch; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.strokeStyle = C.acc2; ctx.lineWidth = 2; ctx.stroke();
      },
    };
  };

  /* ---------------- TALISMAN: player attribute radar evolving over a career ---------------- */
  const radar = () => {
    const stats = ["PAC", "SHO", "PAS", "DRI", "PHY", "MEN"];
    const R = rng(5);
    let age = 17, cur = stats.map(() => 40 + R() * 15), target = cur.slice(), acc = 0, legacy = 0;
    const tiers = ["Squad Player", "Cult Hero", "Star", "Legend", "Immortal", "GOAT"];
    const nextSeason = () => {
      age++;
      if (age > 37) { age = 17; legacy = 0; target = stats.map(() => 40 + R() * 15); return; }
      const peak = age < 28 ? 1 : age < 31 ? 0.2 : -1;
      target = target.map((v, i) => Math.max(20, Math.min(97, v + peak * (2 + R() * 6) * (i === 0 && age > 29 ? 1.8 : 1) + (R() - 0.5) * 4)));
      legacy += target.reduce((a, b) => a + b, 0) / 600 * (age < 31 ? 1.4 : 0.8);
    };
    return {
      draw(ctx, w, h, t, dt) {
        acc += dt; if (acc > 1.4) { acc = 0; nextSeason(); }
        cur = cur.map((v, i) => v + (target[i] - v) * Math.min(1, dt * 3));
        ctx.clearRect(0, 0, w, h);
        const cx = w * 0.34, cy = h * 0.52, r = Math.min(w * 0.22, h * 0.36);
        const pt = (i, v) => { const a = -Math.PI / 2 + (i / stats.length) * Math.PI * 2; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
        for (let ring = 1; ring <= 4; ring++) {
          ctx.beginPath(); stats.forEach((_, i) => { const [x, y] = pt(i, ring / 4); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
          ctx.strokeStyle = alpha(C.line2, 0.6); ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.beginPath(); cur.forEach((v, i) => { const [x, y] = pt(i, v / 100); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
        ctx.fillStyle = alpha(C.acc, 0.22); ctx.fill(); ctx.strokeStyle = C.acc; ctx.lineWidth = 2; ctx.stroke();
        stats.forEach((s, i) => { const [x, y] = pt(i, 1.17); label(ctx, `${s} ${cur[i].toFixed(0)}`, x, y + 4, C.muted, 10, "center"); });
        const px = w * 0.68;
        label(ctx, `AGE ${age}`, px, h * 0.3, C.text, 22);
        const ovr = cur.reduce((a, b) => a + b, 0) / cur.length;
        label(ctx, `OVR ${ovr.toFixed(0)}`, px, h * 0.3 + 28, C.acc, 14);
        label(ctx, age < 28 ? "rising" : age < 31 ? "prime" : "decline", px, h * 0.3 + 48, C.dim, 11);
        label(ctx, "LEGACY", px, h * 0.62, C.dim, 10);
        ctx.fillStyle = alpha(C.line2, 0.6); ctx.fillRect(px, h * 0.62 + 8, w * 0.22, 6);
        const lp = Math.min(1, legacy / 20); ctx.fillStyle = "#e7c35a"; ctx.fillRect(px, h * 0.62 + 8, w * 0.22 * lp, 6);
        label(ctx, tiers[Math.min(5, Math.floor(lp * 6))], px, h * 0.62 + 32, "#e7c35a", 12);
      },
    };
  };

  const VISUALS = { market, arena, router, rl, radar };

  /** Deterministic SVG glyph for any repo — a tiny "feature map". */
  function glyph(name, color) {
    let s = 0; for (const ch of name) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const R = rng(s), cells = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
      const on = R() > 0.45, o = (0.35 + R() * 0.65).toFixed(2);
      if (on) [x, 4 - x].forEach((xx, k) => { if (k && xx === x) return; cells.push(`<rect x="${4 + xx * 7.2}" y="${4 + y * 7.2}" width="6" height="6" rx="1.5" fill="${color}" opacity="${o}"/>`); });
    }
    return `<svg class="glyph" viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" rx="10" fill="${color}" opacity=".08"/>${cells.join("")}</svg>`;
  }

  window.Visuals = {
    hero,
    mount: (canvas, kind) => VISUALS[kind] && mount(canvas, VISUALS[kind]),
    glyph,
    alpha,
  };
})();
