/* Force-directed project ↔ skill graph. No library; ~50 nodes so O(n²) is fine. */
(function () {
  function SkillGraph(canvas, tip, { projects, onOpen }) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, raf = 0, visible = false, hover = null, drag = null, energy = 1;
    const nodes = [], links = [], byId = new Map();
    const node = (id, kind, data) => {
      if (byId.has(id)) return byId.get(id);
      const n = { id, kind, data, x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 200, vx: 0, vy: 0, deg: 0 };
      nodes.push(n); byId.set(id, n); return n;
    };
    projects.forEach((p) => {
      const pn = node("p:" + p.repo, "project", p);
      p.skills.forEach((s) => { const sn = node("s:" + s, "skill", { name: s }); links.push({ a: pn, b: sn }); pn.deg++; sn.deg++; });
    });
    nodes.forEach((n) => { n.r = n.kind === "project" ? 7 + Math.min(8, n.data.weight || 0) : 3 + Math.min(7, n.deg * 1.2); });

    const color = () => {
      const s = getComputedStyle(document.documentElement);
      return { acc: s.getPropertyValue("--acc").trim(), acc2: s.getPropertyValue("--acc-2").trim(), line: s.getPropertyValue("--line-2").trim(),
               text: s.getPropertyValue("--text").trim(), muted: s.getPropertyValue("--muted").trim(), mono: s.getPropertyValue("--mono").trim() };
    };
    let C = color();
    addEventListener("themechange", () => { C = color(); draw(); });

    function step() {
      const k = 0.9;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy || 0.01;
        const f = (a.kind === "project" && b.kind === "project" ? 2600 : 900) / d2;
        const d = Math.sqrt(d2); dx /= d; dy /= d;
        a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
      }
      links.forEach(({ a, b }) => {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 70) * 0.012;
        a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
      });
      const sx = w / Math.max(w, h), sy = h / Math.max(w, h);
      nodes.forEach((n) => {
        n.vx -= n.x * 0.004 / sx; n.vy -= n.y * 0.006 / sy;
        if (n === drag) return;
        n.vx *= k * 0.6; n.vy *= k * 0.6; n.x += n.vx; n.y += n.vy;
        const mx = w / 2 - 30, my = h / 2 - 20;
        n.x = Math.max(-mx, Math.min(mx, n.x)); n.y = Math.max(-my, Math.min(my, n.y));
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.save(); ctx.translate(w / 2, h / 2);
      const focus = hover && new Set([hover, ...links.filter((l) => l.a === hover || l.b === hover).flatMap((l) => [l.a, l.b])]);
      links.forEach(({ a, b }) => {
        const on = focus && focus.has(a) && focus.has(b);
        ctx.strokeStyle = on ? C.acc : C.line; ctx.globalAlpha = focus ? (on ? 0.9 : 0.15) : 0.55; ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      nodes.forEach((n) => {
        const dim = focus && !focus.has(n);
        ctx.globalAlpha = dim ? 0.2 : 1;
        const col = n.kind === "project" ? C.acc : C.acc2;
        if (n.kind === "project") { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = n === hover ? 18 : 8; }
        else { ctx.fillStyle = col; ctx.shadowBlur = 0; }
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        const showLabel = n.kind === "project" || n.deg > 1 || (focus && focus.has(n));
        if (showLabel) {
          ctx.font = `${n.kind === "project" ? 12 : 10.5}px ${C.mono}`; ctx.textAlign = "center";
          ctx.fillStyle = n.kind === "project" ? C.text : C.muted;
          ctx.fillText(n.kind === "project" ? n.data.name : n.data.name, n.x, n.y - n.r - 6);
        }
      });
      ctx.restore(); ctx.globalAlpha = 1;
    }

    function loop() {
      if (energy > 0.02 || drag) { step(); energy *= 0.995; }
      draw();
      if (visible) raf = requestAnimationFrame(loop);
    }

    const resize = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      energy = 1; draw();
    };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) loop(); }).observe(canvas);

    const at = (e) => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left - w / 2, y = e.clientY - r.top - h / 2;
      return { x, y, n: nodes.slice().reverse().find((n) => Math.hypot(n.x - x, n.y - y) < n.r + 6) };
    };
    let downAt = null;
    canvas.addEventListener("pointerdown", (e) => { const p = at(e); downAt = p; if (p.n) { drag = p.n; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; } });
    canvas.addEventListener("pointermove", (e) => {
      const p = at(e);
      if (drag) { drag.x = p.x; drag.y = p.y; drag.vx = drag.vy = 0; energy = Math.max(energy, 0.4); }
      hover = drag || p.n || null;
      canvas.style.cursor = drag ? "grabbing" : hover ? "pointer" : "grab";
      if (hover) {
        const d = hover.data;
        tip.hidden = false;
        tip.innerHTML = hover.kind === "project"
          ? `<b>${d.name}</b><br><span style="color:var(--muted)">${d.description || ""}</span>`
          : `<b>${d.name}</b><br><span style="color:var(--muted)">used in ${hover.deg} project${hover.deg > 1 ? "s" : ""}</span>`;
        tip.style.left = Math.min(w - 270, p.x + w / 2 + 14) + "px"; tip.style.top = (p.y + h / 2 + 14) + "px";
      } else tip.hidden = true;
      if (!visible) draw();
    });
    const up = (e) => {
      const p = at(e);
      if (drag && downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 4 && drag.kind === "project") onOpen(drag.data.repo);
      drag = null; downAt = null; canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointerleave", () => { hover = null; tip.hidden = true; });
  }
  window.SkillGraph = SkillGraph;
})();
