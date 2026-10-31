// Dibujos técnicos de cada proyecto, hechos con rough.js (en modo preciso) dentro de cada <svg data-fig>.
// Al entrar en pantalla se trazan solos y después circulan puntos por las flechas.
// Las figuras 2 y 3 son 3D y están en figures3d.js.
// Son esquemas conceptuales; los únicos números son los resultados reales de los proyectos.

import rough from "roughjs";

const INK = "#1d2433";
const PENCIL = "#b8402a";
const SOFT = "#5d6575";
const NS = "http://www.w3.org/2000/svg";
// roughness 0 y bowing 0: líneas rectas y limpias, sin efecto "a mano"
const base = { stroke: INK, strokeWidth: 1.1, roughness: 0, bowing: 0, seed: 4 };

function text(svg, x, y, str, { size = 11, color = SOFT, anchor = "start", rot = 0 } = {}) {
  const el = document.createElementNS(NS, "text");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("font-family", "IBM Plex Mono, monospace");
  el.setAttribute("font-size", size);
  el.setAttribute("fill", color);
  el.setAttribute("text-anchor", anchor);
  if (rot) el.setAttribute("transform", `rotate(${rot} ${x} ${y})`);
  el.textContent = str;
  svg.appendChild(el);
}

function draw(svg, rc) {
  const add = (node) => svg.appendChild(node);
  const o = (extra = {}) => ({ ...base, ...extra });
  // "flows": recorridos por los que luego circulan puntos animados (datos)
  svg._flows ??= [];
  const flow = (pts) => svg._flows.push(pts);
  const arrow = (x1, y1, x2, y2, { noFlow, ...extra } = {}) => {
    add(rc.line(x1, y1, x2, y2, o(extra)));
    if (!noFlow) flow([[x1, y1], [x2, y2]]);
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (const s of [-1, 1]) add(rc.line(x2, y2, x2 - 9 * Math.cos(a + s * 0.45), y2 - 9 * Math.sin(a + s * 0.45), o(extra)));
  };
  const boxed = (x, y, w, h, label, extra = {}) => {
    add(rc.rectangle(x, y, w, h, o(extra)));
    text(svg, x + w / 2, y + h / 2 + 5, label, { anchor: "middle", color: INK });
  };
  return { add, o, arrow, boxed, flow };
}

const FIGS = {
  // Fig. 1: camino del audio
  audio(svg, rc) {
    const { add, o, arrow, boxed } = draw(svg, rc);
    add(rc.circle(28, 62, 26, o()));
    text(svg, 28, 100, "mic", { anchor: "middle" });
    boxed(62, 42, 66, 40, "codec");
    boxed(160, 42, 84, 40, "VHDL logic", { fill: "rgba(200,67,43,0.18)", fillStyle: "hachure", hachureGap: 6, fillWeight: 0.8 });
    boxed(160, 140, 84, 36, "memory");
    boxed(62, 140, 66, 36, "ARM · C");
    add(rc.polygon([[272, 52], [290, 40], [290, 84], [272, 72]], o()));
    text(svg, 284, 104, "out", { anchor: "middle" });
    arrow(42, 62, 60, 62);
    arrow(128, 62, 158, 62);
    arrow(244, 62, 270, 62);
    arrow(194, 84, 194, 138);
    arrow(212, 138, 212, 84);
    arrow(95, 138, 95, 86, { strokeLineDash: [5, 5] });
    text(svg, 102, 120, "config", { size: 10, color: PENCIL });
    text(svg, 222, 116, "rec / play", { size: 10, color: PENCIL });
  },

  // Fig. 4: caras reales y generadas pasando por la red
  deepfake(svg, rc) {
    const { add, o, arrow, boxed } = draw(svg, rc);
    // cada imagen: un marco con el contorno de la cara y sus puntos de referencia
    const face = (cx, cy, odd) => {
      add(rc.rectangle(cx - 34, cy - 38, 68, 76, o()));
      add(rc.ellipse(cx, cy, 40, 52, o({ stroke: SOFT, strokeLineDash: [3, 3] })));
      const pts = [[-9, -7], [9, odd ? -4 : -7], [0, 3], [-7, 13], [7, odd ? 11 : 13]];
      pts.forEach(([dx, dy]) => add(rc.circle(cx + dx, cy + dy, 3.5, o({ fill: odd ? PENCIL : INK, fillStyle: "solid", stroke: "none" }))));
    };
    face(36, 52, false);
    face(36, 158, true);
    boxed(116, 80, 100, 50, "EfficientNet");
    arrow(68, 62, 114, 96);
    arrow(68, 148, 114, 116);
    arrow(218, 96, 256, 66);
    arrow(218, 116, 256, 146);
    text(svg, 262, 70, "real", { color: INK });
    text(svg, 262, 152, "fake", { color: PENCIL });
    text(svg, 166, 160, "+ JPEG, blur", { anchor: "middle", size: 10, color: PENCIL });
  },

  // Fig. 5: un flujo de red convertido en imagen para la CNN
  flows(svg, rc) {
    const { add, o, arrow, boxed } = draw(svg, rc);
    text(svg, 16, 30, "[0.2, 0.9, 0.1, 0.4, 0.7 …]", { color: INK, size: 11 });
    arrow(80, 42, 80, 62);
    let s = 9;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const v = rnd();
      add(rc.rectangle(32 + c * 16, 70 + r * 16, 16, 16, o({ strokeWidth: 0.8, roughness: 0.6, fill: v > 0.35 ? INK : "none", fillStyle: "hachure", hachureGap: 2 + (1 - v) * 7, fillWeight: 0.7 })));
    }
    arrow(136, 118, 172, 118);
    boxed(176, 96, 60, 44, "CNN");
    arrow(238, 118, 262, 118);
    text(svg, 266, 112, "DDoS?", { color: PENCIL });
    text(svg, 266, 132, "benign?", { size: 10 });
  },

  // Fig. 6: el bucle agente-mercado
  rl(svg, rc) {
    const { add, o, arrow, boxed, flow } = draw(svg, rc);
    boxed(18, 74, 96, 54, "agent · PPO");
    add(rc.rectangle(196, 64, 108, 74, o()));
    text(svg, 250, 86, "market · SPY", { anchor: "middle", color: INK });
    add(rc.linearPath([[208, 124], [222, 112], [234, 118], [248, 100], [262, 106], [276, 94], [292, 98]], o({ stroke: PENCIL })));
    arrow(70, 70, 70, 34, { noFlow: true });
    add(rc.line(70, 34, 250, 34, o()));
    arrow(250, 34, 250, 60, { noFlow: true });
    text(svg, 160, 26, "buy · sell · hold", { anchor: "middle", color: PENCIL });
    add(rc.line(250, 142, 250, 176, o()));
    add(rc.line(250, 176, 70, 176, o()));
    arrow(70, 176, 70, 132, { noFlow: true });
    flow([[70, 72], [70, 34], [250, 34], [250, 62]]);
    flow([[250, 140], [250, 176], [70, 176], [70, 130]]);
    text(svg, 160, 196, "state + reward after costs", { anchor: "middle", color: PENCIL });
    text(svg, 300, 160, "every 5 min", { anchor: "end", size: 10 });
  },

  // Fig. 7: resultados reales (AUC de test)
  coin(svg, rc) {
    const { add, o } = draw(svg, rc);
    const Y = (auc) => 180 - (auc - 0.4) * 400; // 0.4 → 180, 0.8 → 20
    add(rc.line(50, 180, 300, 180, o()));
    add(rc.line(50, 180, 50, 16, o()));
    for (const a of [0.5, 0.6, 0.7]) text(svg, 44, Y(a) + 5, a.toFixed(1), { anchor: "end", size: 10 });
    add(rc.line(50, Y(0.5), 300, Y(0.5), o({ stroke: SOFT, strokeLineDash: [6, 6], strokeWidth: 1 })));
    text(svg, 298, Y(0.5) - 6, "coin flip", { anchor: "end", size: 10 });
    add(rc.rectangle(90, Y(0.51), 52, 180 - Y(0.51), o({ fill: INK, fillStyle: "hachure", hachureGap: 7 })));
    text(svg, 116, Y(0.51) - 8, "≈ 0.5", { anchor: "middle", color: INK });
    add(rc.rectangle(200, Y(0.72), 52, Y(0.62) - Y(0.72), o({ stroke: PENCIL, fill: PENCIL, fillStyle: "cross-hatch", hachureGap: 7 })));
    text(svg, 262, Y(0.72) + 4, "0.72", { color: PENCIL, size: 10 });
    text(svg, 262, Y(0.62) + 4, "0.62", { color: PENCIL, size: 10 });
    text(svg, 116, 200, "S&P 500", { anchor: "middle" });
    text(svg, 226, 200, "single stocks", { anchor: "middle" });
  },
};

// ---------- Animación ----------
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DRAW_MS = 1400;

// Deja la figura "sin dibujar": cada trazo oculto con un guion tan largo como él mismo
function hide(svg) {
  svg.querySelectorAll("path").forEach((p) => {
    if (p.getAttribute("stroke") === "none") { p.style.opacity = 0; return; }
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = len;
  });
  svg.querySelectorAll("text").forEach((t) => (t.style.opacity = 0));
}

// Traza la figura: los trazos aparecen en orden, como si se dibujaran
function reveal(svg) {
  const paths = [...svg.querySelectorAll("path")];
  paths.forEach((p, i) => {
    const delay = (i / paths.length) * DRAW_MS;
    p.style.transition = `stroke-dashoffset 700ms ease ${delay}ms, opacity 500ms ease ${delay}ms`;
    p.style.strokeDashoffset = 0;
    p.style.opacity = 1;
    // al terminar se quita el guion temporal para recuperar las líneas discontinuas
    setTimeout(() => { p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; }, delay + 750);
  });
  svg.querySelectorAll("text").forEach((t, i) => {
    t.style.transition = `opacity 500ms ease ${DRAW_MS * 0.5 + i * 60}ms`;
    t.style.opacity = 1;
  });
  setTimeout(() => startFlows(svg), DRAW_MS + 600);
}

// Puntos que recorren los "flows" de la figura una y otra vez
const active = new Set();
function startFlows(svg) {
  svg._dots = (svg._flows ?? []).map((pts, k) => {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", 2.8);
    dot.setAttribute("fill", PENCIL);
    svg.appendChild(dot);
    return { pts, acc, dot, offset: k * 0.37 };
  });
  active.add(svg);
}
function tick(now) {
  const t = now / 1000;
  active.forEach((svg) => {
    if (!svg._visible) return;
    svg._dots.forEach(({ pts, acc, dot, offset }) => {
      const total = acc[acc.length - 1];
      const u = (t * 0.55 + offset) % 1.4; // 0–1 recorre la flecha; 1–1.4 pausa
      dot.style.opacity = u < 1 ? 1 : 0;
      const d = Math.min(u, 1) * total;
      let i = 1;
      while (i < acc.length - 1 && acc[i] < d) i++;
      const f = (d - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
      dot.setAttribute("cx", pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f);
      dot.setAttribute("cy", pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
    });
  });
  requestAnimationFrame(tick);
}

// Esperar a la letra para que los textos de las figuras salgan bien
(document.fonts?.ready ?? Promise.resolve()).then(() => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: svg, isIntersecting }) => {
      svg._visible = isIntersecting;
      if (isIntersecting && !svg._shown) { svg._shown = true; reveal(svg); }
    });
  }, { threshold: 0.35 });

  document.querySelectorAll("svg[data-fig]").forEach((svg) => {
    FIGS[svg.dataset.fig]?.(svg, rough.svg(svg));
    if (reducedMotion) return; // sin animaciones: la figura se queda dibujada
    hide(svg);
    io.observe(svg);
  });
  if (!reducedMotion) requestAnimationFrame(tick);
});
