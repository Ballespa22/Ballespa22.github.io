// Fig. 0: la placa Zybo Z7 dibujada como un plano técnico (solo líneas de tinta).
// Al bajar por la portada las piezas se separan ("vista explosionada") y aparecen
// anotaciones con el nombre de cada pieza.

import * as THREE from "three";

const rig = document.getElementById("rig");
const canvas = document.getElementById("board");
const hero = document.querySelector(".hero");
const labelsEl = document.getElementById("labels");
const leaders = document.getElementById("leaders");
const hint = document.getElementById("hint");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  rig.classList.add("no-webgl");
  throw new Error("WebGL no disponible");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
// Cámara ortográfica: sin perspectiva, como en un dibujo técnico
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

const INK = "#1d2433";
const PAPER = "#f6f4ef";
// Las caras se pintan del color del papel y tapan lo que hay detrás;
// "polygonOffset" las empuja un poco hacia atrás para que las aristas se vean encima.
const paperMat = new THREE.MeshBasicMaterial({ color: PAPER, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const inkMat = new THREE.LineBasicMaterial({ color: INK });
const faintMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.3 });

// Un sólido = caras de papel + aristas de tinta
function solid(parent, geo, x, y, z, rot = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geo, paperMat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(...rot);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), inkMat));
  parent.add(mesh);
  return mesh;
}
function ring(parent, r, x, y, z, mat = inkMat) {
  const pts = [];
  for (let k = 0; k <= 24; k++) pts.push(new THREE.Vector3(Math.cos((k / 24) * Math.PI * 2) * r, 0, Math.sin((k / 24) * Math.PI * 2) * r));
  const loop = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  loop.position.set(x, y, z);
  parent.add(loop);
}

// Cada pieza: un grupo que sube "lift" y se desplaza "spread" al despiezarse
const parts = [];
function part(lift, spread = [0, 0]) {
  const g = new THREE.Group();
  g.userData = { lift, spread };
  scene.add(g);
  parts.push(g);
  return g;
}

const TOP = 0.08; // cara superior de la placa
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// --- Placa ---
const pcb = part(0);
solid(pcb, box(10, 0.16, 7.6), 0, 0, 0);
[[-4.55, -3.4], [4.55, -3.4], [-4.55, 3.4], [4.55, 3.4]].forEach(([x, z]) => ring(pcb, 0.18, x, TOP + 0.002, z));
// Pistas: rutas en ángulo recto desde el chip principal hacia el resto
{
  let s = 3;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const targets = [[3, 0.3], [-2.8, -2.2], [-3, -3], [1.6, 3], [-1, 3], [4.4, -1.8], [4.4, 1.6], [-4.4, 1.2], [2.4, -2.6]];
  const pts = [];
  for (let k = 0; k < 46; k++) {
    const [tx, tz] = targets[k % targets.length];
    const sx = 0.4 + (rnd() - 0.5) * 2, sz = 0.3 + (rnd() - 0.5) * 2;
    const mx = lerp(sx, tx, 0.3 + rnd() * 0.5) + (rnd() - 0.5) * 0.6;
    const ex = tx + (rnd() - 0.5) * 0.7, ez = tz + (rnd() - 0.5) * 0.5;
    const y = TOP + 0.003;
    pts.push(sx, y, sz, mx, y, sz, mx, y, sz, mx, y, ez, mx, y, ez, ex, y, ez);
  }
  const g = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  pcb.add(new THREE.LineSegments(g, faintMat));
}

// --- Chips ---
const zynq = part(3.4);
solid(zynq, box(2.2, 0.28, 2.2), 0.4, TOP + 0.14, 0.3);
ring(zynq, 0.12, -0.45, TOP + 0.285, -0.55);

const ddr = part(2.5, [0.6, 0]);
solid(ddr, box(1.6, 0.18, 0.95), 3, TOP + 0.09, 0.3);

const codec = part(2.8, [-0.4, -0.2]);
solid(codec, box(0.8, 0.16, 0.8), -2.8, TOP + 0.08, -2.2);

// --- Conectores ---
const jacks = part(1.6, [0, -1.2]);
[-3.9, -3.0, -2.1].forEach((x) => {
  solid(jacks, box(0.7, 0.55, 0.9), x, TOP + 0.28, -3.25);
  solid(jacks, new THREE.CylinderGeometry(0.2, 0.2, 0.35, 12), x, TOP + 0.3, -3.85, [Math.PI / 2, 0, 0]);
});

const hdmi = part(1.4, [1.1, 0]);
[-1.8, 1.6].forEach((z) => solid(hdmi, box(1.1, 0.45, 0.95), 4.55, TOP + 0.23, z));

const usb = part(1.2, [-1, 0]);
solid(usb, box(0.75, 0.32, 0.6), -4.6, TOP + 0.16, 1.2);

const pmod = part(1.0, [0, 1.1]);
[-3.6, -1.8, 0, 1.8].forEach((x) => {
  solid(pmod, box(1.5, 0.25, 0.5), x, TOP + 0.13, 3.3);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    solid(pmod, box(0.07, 0.4, 0.07), x - 0.6 + i * 0.24, TOP + 0.45, 3.18 + j * 0.24);
  }
});

const buttons = part(2.0, [0.2, -0.4]);
[1.2, 2.0, 2.8, 3.6].forEach((x) => {
  solid(buttons, box(0.45, 0.14, 0.45), x, TOP + 0.07, -2.55);
  solid(buttons, new THREE.CylinderGeometry(0.15, 0.15, 0.14, 12), x, TOP + 0.21, -2.55);
  solid(buttons, box(0.22, 0.12, 0.45), x, TOP + 0.06, -3.3);
});

// --- Anotaciones ---
// anchor: punto de la pieza (coordenadas locales del grupo); off: dónde va el texto, en píxeles
const NOTES = [
  { part: zynq, anchor: [0.4, 0.5, 0.3], off: [-30, -120], text: "Zynq-7000", sub: "FPGA + ARM on one chip" },
  { part: ddr, anchor: [3, 0.3, 0.3], off: [120, -80], text: "DDR3", sub: "where the audio is stored" },
  { part: codec, anchor: [-2.8, 0.3, -2.2], off: [-150, -50], text: "audio codec", sub: "configured in C" },
  { part: jacks, anchor: [-3, 0.5, -3.4], off: [-140, 50], text: "mic in / headphones" },
  { part: buttons, anchor: [2.4, 0.3, -2.55], off: [150, 40], text: "buttons", sub: "volume, rec / play" },
  { part: pmod, anchor: [-0.9, 0.5, 3.3], off: [30, 80], text: "Pmod headers" },
];
const SVGNS = "http://www.w3.org/2000/svg";
NOTES.forEach((n) => {
  n.el = document.createElement("div");
  n.el.className = "label-note";
  n.el.innerHTML = n.text + (n.sub ? `<small>${n.sub}</small>` : "");
  labelsEl.appendChild(n.el);
  n.line = document.createElementNS(SVGNS, "path");
  n.line.setAttribute("fill", "none");
  n.line.setAttribute("stroke", "#1d2433");
  n.line.setAttribute("stroke-width", "0.8");
  n.dot = document.createElementNS(SVGNS, "circle");
  n.dot.setAttribute("r", "2.4");
  n.dot.setAttribute("fill", "#b8402a");
  leaders.append(n.line, n.dot);
});

// ---------- Tamaño ----------
let W = 1, H = 1;
function resize() {
  W = rig.clientWidth;
  H = rig.clientHeight;
  renderer.setSize(W, H, false);
}
new ResizeObserver(resize).observe(rig);
resize();

const mouse = { x: 0, tx: 0 };
addEventListener("pointermove", (e) => (mouse.tx = (e.clientX / innerWidth) * 2 - 1));

// ---------- Bucle ----------
function lerp(a, b, t) { return a + (b - a) * t; }
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v) => v * v * (3 - 2 * v);
const v = new THREE.Vector3();
let explode = 0;
const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const rect = hero.getBoundingClientRect();
  if (rect.bottom < 0) return; // la portada no se ve: no dibujar

  const progress = clamp(-rect.top / (hero.offsetHeight - innerHeight));
  const target = smooth(clamp((progress - 0.06) / 0.7));
  explode += (target - explode) * (reducedMotion ? 1 : 0.1);
  const e = explode;
  const t = reducedMotion ? 0 : clock.getElapsedTime();

  parts.forEach((g) => {
    const { lift, spread } = g.userData;
    g.position.set(spread[0] * e, lift * e, spread[1] * e);
  });

  // Cámara: gira despacio alrededor de la placa y se eleva al despiezar
  mouse.x += (mouse.tx - mouse.x) * 0.04;
  const az = -0.65 + e * 0.45 + Math.sin(t * 0.25) * 0.05 + mouse.x * 0.08;
  const el = 0.62 - e * 0.12;
  camera.position.set(Math.sin(az) * Math.cos(el) * 40, Math.sin(el) * 40, Math.cos(az) * Math.cos(el) * 40);
  camera.lookAt(0, e * 1.6, 0);
  const aspect = W / H;
  // en pantallas verticales (móvil) hace falta más margen para que la placa no se corte por los lados
  const half = Math.max(4.4, (aspect < 1 ? 7.6 : 5.6) / aspect) + e * 1.3;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  // Anotaciones
  const show = clamp((e - 0.45) / 0.3);
  const k = W < 500 ? 0.55 : 1;
  NOTES.forEach((n) => {
    v.set(...n.anchor).add(n.part.position).project(camera);
    const ax = ((v.x + 1) / 2) * W, ay = ((1 - v.y) / 2) * H;
    // que el texto no se salga por los lados
    const halfW = n.el.offsetWidth / 2 + 4;
    const lx = clamp(ax + n.off[0] * k, halfW, W - halfW), ly = ay + n.off[1] * k;
    n.el.style.left = `${lx}px`;
    n.el.style.top = `${ly}px`;
    n.el.style.opacity = show;
    // línea de referencia recta con un codo horizontal, como en los planos
    const ex = lx + (ax > lx ? 1 : -1) * Math.min(Math.abs(ax - lx), n.el.offsetWidth / 2);
    n.line.setAttribute("d", `M${ex},${ly} L${ax},${ay}`);
    n.line.style.opacity = show;
    n.dot.setAttribute("cx", ax);
    n.dot.setAttribute("cy", ay);
    n.dot.style.opacity = show;
  });
  hint.style.opacity = 1 - clamp(progress * 5);
}
requestAnimationFrame(frame);
