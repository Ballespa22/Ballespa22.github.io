// Filtro de trabajos por temas. Cada trabajo lleva data-topics="hardware vision ...";
// al pulsar un botón se ocultan los que no tienen ese tema.

const buttons = [...document.querySelectorAll(".filters button")];
const items = [...document.querySelectorAll("#work [data-topics]")];
const moreHead = document.getElementById("more");
const has = (el, topic) => topic === "all" || el.dataset.topics.split(" ").includes(topic);

// número de trabajos de cada tema, junto al nombre del botón
buttons.forEach((b) => (b.querySelector("sup").textContent = items.filter((el) => has(el, b.dataset.filter)).length));

function apply(topic) {
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === topic)));
  items.forEach((el) => (el.hidden = !has(el, topic)));
  // el título "More projects" solo se ve si queda alguna ficha
  moreHead.hidden = !items.some((el) => el.classList.contains("card") && !el.hidden);
}

buttons.forEach((b) => b.addEventListener("click", () => apply(b.dataset.filter)));

// los enlaces del índice de la portada abren la sección ya filtrada
document.querySelectorAll(".toc a[data-topic]").forEach((a) =>
  a.addEventListener("click", () => apply(a.dataset.topic)),
);
