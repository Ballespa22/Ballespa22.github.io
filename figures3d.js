// Figuras 2 y 3 en 3D, con el mismo estilo de plano que la placa de la portada:
// caras del color del papel y aristas de tinta. Solo se animan cuando se ven en pantalla.

import * as THREE from "three";

const INK = "#1d2433";
const ACCENT = "#b8402a";
const PAPER = "#fbfaf7"; // fondo de los recuadros de figura
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const inkMat = new THREE.LineBasicMaterial({ color: INK });
const faintMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.22 });
const accentLine = new THREE.LineBasicMaterial({ color: ACCENT });
const paperMat = () =>
  new THREE.MeshBasicMaterial({ color: PAPER, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

// Un sólido = caras de papel + aristas de tinta
function solid(parent, geo, x, y, z, { rot = [0, 0, 0], mat = paperMat() } = {}) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(...rot);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), inkMat));
  parent.add(mesh);
  return mesh;
}
function lines(parent, pts, mat = faintMat) {
  const g = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const l = new THREE.LineSegments(g, mat);
  parent.add(l);
  return l;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ---------- Fig. 2: systolic array ----------
// Una rejilla de multiplicadores (MAC). Las activaciones entran por la izquierda y
// avanzan fila a fila; las sumas parciales bajan por las columnas. Cada celda se
// ilumina cuando le pasa un dato.
function systolic(scene) {
  const N = 5, SP = 1.3;
  const pos = (i) => (i - (N - 1) / 2) * SP;
  const flashOn = new THREE.Color("#efc4b8");
  const flashOff = new THREE.Color(PAPER);

  solid(scene, box(N * SP + 0.5, 0.12, N * SP + 0.5), 0, -0.3, 0);
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    cells.push(solid(scene, box(0.86, 0.36, 0.86), pos(c), 0, pos(r)));
  }
  // buffers de entrada: a la izquierda (activaciones) y arriba (pesos / sumas)
  for (let i = 0; i < N; i++) {
    solid(scene, box(0.5, 0.3, 0.6), pos(-1) - 0.2, 0, pos(i));
    solid(scene, box(0.6, 0.3, 0.5), pos(i), 0, pos(-1) - 0.2);
  }
  // cables entre celdas
  const w = [];
  for (let i = 0; i < N; i++) {
    w.push(pos(-1), 0, pos(i), pos(N - 1), 0, pos(i));
    w.push(pos(i), 0, pos(-1), pos(i), 0, pos(N - 1));
  }
  lines(scene, w);

  // datos en movimiento
  const pulseGeo = box(0.24, 0.24, 0.24);
  const rowPulses = Array.from({ length: N }, () => {
    const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: ACCENT }));
    scene.add(m);
    return m;
  });
  const colPulses = Array.from({ length: N }, () => {
    const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: INK }));
    scene.add(m);
    return m;
  });

  const PERIOD = N + 3;
  const along = (t, i) => ((((t * 1.4 - i * 0.7) % PERIOD) + PERIOD) % PERIOD) - 1.5;

  return {
    half: 4.7,
    update(t) {
      const rowP = [];
      for (let i = 0; i < N; i++) {
        const p = along(t, i);
        rowP.push(p);
        rowPulses[i].position.set(pos(p), 0.36, pos(i));
        rowPulses[i].visible = p < N - 0.6;
        const q = along(t + 0.9, i);
        colPulses[i].position.set(pos(i), 0.36, pos(q));
        colPulses[i].visible = q < N - 0.6;
      }
      cells.forEach((cell, k) => {
        const r = Math.floor(k / N), c = k % N;
        const glow = Math.max(0, 1 - Math.abs(rowP[r] - c) * 1.5);
        cell.material.color.copy(flashOff).lerp(flashOn, glow);
      });
      return { az: 0.75 + Math.sin(t * 0.3) * 0.22, el: 0.72, look: [0.3, 0, 0.3] };
    },
  };
}

// ---------- Fig. 3: dron con seguimiento ----------
// Un cuadricóptero en estacionario; su cámara mira al suelo y cada objeto que se
// mueve dentro del encuadre lleva su caja de detección y su rastro.
function drone(scene) {
  const GROUND = -2.4;
  const craft = new THREE.Group();
  scene.add(craft);

  solid(craft, box(1.1, 0.32, 1.1), 0, 0, 0, { rot: [0, Math.PI / 4, 0] });
  solid(craft, box(0.7, 0.14, 0.7), 0, 0.23, 0, { rot: [0, Math.PI / 4, 0] });
  const props = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const cx = Math.cos(a), cz = Math.sin(a);
    solid(craft, box(2.0, 0.1, 0.14), cx * 1.05, 0, cz * 1.05, { rot: [0, -a, 0] });
    solid(craft, new THREE.CylinderGeometry(0.2, 0.2, 0.26, 12), cx * 2.05, 0.08, cz * 2.05);
    const prop = new THREE.Group();
    prop.position.set(cx * 2.05, 0.26, cz * 2.05);
    solid(prop, box(1.5, 0.02, 0.12), 0, 0, 0);
    // disco que barre la hélice, muy tenue
    const ring = [];
    for (let i = 0; i < 32; i++) {
      const a0 = (i / 32) * Math.PI * 2, a1 = ((i + 1) / 32) * Math.PI * 2;
      ring.push(Math.cos(a0) * 0.75, 0, Math.sin(a0) * 0.75, Math.cos(a1) * 0.75, 0, Math.sin(a1) * 0.75);
    }
    lines(prop, ring);
    craft.add(prop);
    props.push({ prop, dir: k % 2 ? 1 : -1 });
  }
  // patas y cámara
  [-0.45, 0.45].forEach((x) => solid(craft, box(0.08, 0.08, 1.3), x, -0.42, 0));
  solid(craft, box(0.5, 0.3, 0.4), 0, -0.32, 0);
  solid(craft, new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12), 0, -0.52, 0.05);

  // suelo: rejilla tenue
  const g = [];
  for (let i = -6; i <= 6; i++) {
    g.push(i, GROUND, -6, i, GROUND, 6);
    g.push(-6, GROUND, i, 6, GROUND, i);
  }
  lines(scene, g, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.1 }));

  // encuadre de la cámara en el suelo y líneas del cono de visión
  const FW = 3.2, FD = 2.2;
  const corners = [[-FW, -FD], [FW, -FD], [FW, FD], [-FW, FD]];
  const frame = [];
  corners.forEach(([x, z], i) => {
    const [x2, z2] = corners[(i + 1) % 4];
    frame.push(x, GROUND, z, x2, GROUND, z2);
  });
  lines(scene, frame, accentLine);
  const cone = lines(scene, new Array(24).fill(0), new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.35 }));

  // objetos en el suelo, cada uno con su caja y su rastro
  const TRAIL = 50;
  const targets = [0, 1, 2].map((k) => {
    const dot = solid(scene, new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), 0, GROUND + 0.03, 0, {
      mat: new THREE.MeshBasicMaterial({ color: INK }),
    });
    const s = 0.34;
    const sq = lines(scene, [-s, 0, -s, s, 0, -s, s, 0, -s, s, 0, s, s, 0, s, -s, 0, s, -s, 0, s, -s, 0, -s], accentLine);
    const trailPos = new Float32Array(TRAIL * 3);
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(trailPos, 3)),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.35 }),
    );
    scene.add(trail);
    return { dot, sq, trail, trailPos, k };
  });
  const path = (t, k) => [
    Math.sin(t * (0.5 + k * 0.17) + k * 2) * (FW - 0.6),
    Math.sin(t * (0.37 + k * 0.11) + k) * (FD - 0.5),
  ];

  return {
    half: 3.9,
    update(t) {
      craft.position.y = 1.2 + Math.sin(t * 1.4) * 0.1;
      props.forEach(({ prop, dir }) => (prop.rotation.y = t * 18 * dir));

      const cp = cone.geometry.attributes.position.array;
      const cy = craft.position.y - 0.6;
      corners.forEach(([x, z], i) => cp.set([0, cy, 0.05, x, GROUND, z], i * 6));
      cone.geometry.attributes.position.needsUpdate = true;

      targets.forEach(({ dot, sq, trail, trailPos, k }) => {
        const [x, z] = path(t, k);
        dot.position.set(x, GROUND + 0.03, z);
        sq.position.set(x, GROUND + 0.01, z);
        for (let i = 0; i < TRAIL; i++) {
          const [px, pz] = path(t - i * 0.05, k);
          trailPos.set([px, GROUND + 0.01, pz], i * 3);
        }
        trail.geometry.attributes.position.needsUpdate = true;
      });
      return { az: 0.6 + t * 0.12, el: 0.5, look: [0, -0.5, 0] };
    },
  };
}

// ---------- Montaje común ----------
const BUILDERS = { systolic, drone };
const figs = [];

document.querySelectorAll("[data-fig3d]").forEach((el) => {
  const canvas = el.querySelector("canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return; // sin WebGL la figura se queda vacía, con su pie de figura
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const fig = { el, renderer, scene, camera, visible: false, ...BUILDERS[el.dataset.fig3d](scene) };

  const resize = () => renderer.setSize(el.clientWidth, el.clientHeight, false);
  new ResizeObserver(resize).observe(el);
  resize();
  new IntersectionObserver(([e]) => (fig.visible = e.isIntersecting)).observe(el);
  figs.push(fig);
  render(fig, 2); // primer fotograma, aunque no se vea aún
});

function render(fig, t) {
  const { az, el: elev, look } = fig.update(t);
  const { camera, el } = fig;
  camera.position.set(Math.sin(az) * Math.cos(elev) * 30, Math.sin(elev) * 30, Math.cos(az) * Math.cos(elev) * 30);
  camera.lookAt(...look);
  const aspect = el.clientWidth / el.clientHeight || 1.5;
  camera.left = -fig.half * aspect;
  camera.right = fig.half * aspect;
  camera.top = fig.half;
  camera.bottom = -fig.half;
  camera.updateProjectionMatrix();
  fig.renderer.render(fig.scene, camera);
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const t = 2 + clock.getElapsedTime();
  figs.forEach((f) => f.visible && render(f, t));
}
if (!reducedMotion) loop();
