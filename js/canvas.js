import { db, DB_PATH, ref, update, get } from "./firebase.js";

export function mountDragCanvas(stageId) {
  const stage = document.getElementById(stageId);
  let currentBox = null;
  let deltaX = 0;
  let deltaY = 0;

  stage.addEventListener("mousedown", (e) => {
    const box = e.target.closest(".overlay-box");
    if (!box) return;

    stage.querySelectorAll(".overlay-box").forEach((el) => el.classList.remove("is-selected"));
    box.classList.add("is-selected");

    currentBox = box;
    const boxRect = currentBox.getBoundingClientRect();
    deltaX = e.clientX - boxRect.left;
    deltaY = e.clientY - boxRect.top;
  });

  window.addEventListener("mousemove", (e) => {
    if (!currentBox) return;

    const stageRect = stage.getBoundingClientRect();
    let xPx = e.clientX - stageRect.left - deltaX;
    let yPx = e.clientY - stageRect.top - deltaY;

    xPx = Math.max(0, Math.min(xPx, stageRect.width - currentBox.offsetWidth));
    yPx = Math.max(0, Math.min(yPx, stageRect.height - currentBox.offsetHeight));

    const xPct = ((xPx / stageRect.width) * 100).toFixed(2);
    const yPct = ((yPx / stageRect.height) * 100).toFixed(2);

    currentBox.style.left = `${xPct}%`;
    currentBox.style.top = `${yPct}%`;
  });

  window.addEventListener("mouseup", async () => {
    if (!currentBox) return;

    const moduleId = currentBox.dataset.module;
    const x = parseFloat(currentBox.style.left) || 0;
    const y = parseFloat(currentBox.style.top) || 0;

    if (moduleId) {
      await update(ref(db, `${DB_PATH}/modules/${moduleId}/pos`), { x, y });
    }

    currentBox = null;
  });
}

export async function syncCanvasPositions() {
  const snap = await get(ref(db, `${DB_PATH}/modules`));
  if (!snap.exists()) return;

  const modules = snap.val();
  Object.entries(modules).forEach(([key, cfg]) => {
    const box = document.querySelector(`.overlay-box[data-module="${key}"]`);
    if (box && cfg.pos) {
      box.style.left = `${cfg.pos.x ?? 5}%`;
      box.style.top = `${cfg.pos.y ?? 5}%`;
    }
  });
}
