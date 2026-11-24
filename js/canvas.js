import { db, DB_PATH, ref, update, get } from "./firebase.js";

const SNAP_TARGETS = [0, 5, 25, 33.33, 50, 66.67, 75, 95, 100];
const SNAP_THRESHOLD_PCT = 1.6;

function ensureGuides(stage) {
  let vGuide = stage.querySelector(".snap-guide-v");
  let hGuide = stage.querySelector(".snap-guide-h");
  if (!vGuide) {
    vGuide = document.createElement("div");
    vGuide.className = "snap-guide-v";
    vGuide.style.cssText =
      "position:absolute;top:0;bottom:0;width:1px;border-left:1px dashed #38bdf8;pointer-events:none;display:none;z-index:15;";
    stage.appendChild(vGuide);
  }
  if (!hGuide) {
    hGuide = document.createElement("div");
    hGuide.className = "snap-guide-h";
    hGuide.style.cssText =
      "position:absolute;left:0;right:0;height:1px;border-top:1px dashed #38bdf8;pointer-events:none;display:none;z-index:15;";
    stage.appendChild(hGuide);
  }
  return { vGuide, hGuide };
}

function snapValue(valPct, halfSizePct = 0) {
  for (const target of SNAP_TARGETS) {
    if (Math.abs(valPct - target) <= SNAP_THRESHOLD_PCT) {
      return { snapped: Number(target.toFixed(2)), guide: target, mode: "edge" };
    }
    if (halfSizePct > 0) {
      const centerPct = valPct + halfSizePct;
      if (Math.abs(centerPct - target) <= SNAP_THRESHOLD_PCT) {
        return {
          snapped: Number((target - halfSizePct).toFixed(2)),
          guide: target,
          mode: "center"
        };
      }
    }
  }
  return { snapped: Number(valPct.toFixed(2)), guide: null, mode: null };
}

export function mountDragCanvas(stageId = "stage", options = {}) {
  const stage = document.getElementById(stageId);
  if (!stage) return;

  const snapEnabledGetter = options.getSnapEnabled || (() => true);
  const { vGuide, hGuide } = ensureGuides(stage);

  stage.querySelectorAll(".overlay-box").forEach((box) => {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeftPx = 0;
    let origTopPx = 0;

    box.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;

      stage.querySelectorAll(".overlay-box").forEach((b) => b.classList.remove("is-selected"));
      box.classList.add("is-selected");

      const rect = stage.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeftPx = boxRect.left - rect.left;
      origTopPx = boxRect.top - rect.top;
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const boxRect = box.getBoundingClientRect();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let nextLeftPx = origLeftPx + dx;
      let nextTopPx = origTopPx + dy;

      let xPct = (nextLeftPx / rect.width) * 100;
      let yPct = (nextTopPx / rect.height) * 100;

      // Rango amplio para permitir desbordes/nombres largos sin quedar atrapado
      xPct = Math.max(-25, Math.min(115, xPct));
      yPct = Math.max(-20, Math.min(110, yPct));

      vGuide.style.display = "none";
      hGuide.style.display = "none";

      if (snapEnabledGetter()) {
        const halfWPct = ((boxRect.width / rect.width) * 100) / 2;
        const halfHPct = ((boxRect.height / rect.height) * 100) / 2;

        const sx = snapValue(xPct, halfWPct);
        const sy = snapValue(yPct, halfHPct);

        xPct = sx.snapped;
        yPct = sy.snapped;

        if (sx.guide !== null) {
          vGuide.style.left = `${sx.guide}%`;
          vGuide.style.display = "block";
        }
        if (sy.guide !== null) {
          hGuide.style.top = `${sy.guide}%`;
          hGuide.style.display = "block";
        }
      }

      box.style.left = `${xPct}%`;
      box.style.top = `${yPct}%`;
      box.dataset.x = String(xPct);
      box.dataset.y = String(yPct);
    });

    window.addEventListener("mouseup", async () => {
      if (!dragging) return;
      dragging = false;
      vGuide.style.display = "none";
      hGuide.style.display = "none";

      const mod = box.dataset.module;
      if (!mod) return;

      const x = parseFloat(box.dataset.x ?? parseFloat(box.style.left) ?? 14);
      const y = parseFloat(box.dataset.y ?? parseFloat(box.style.top) ?? 76);

      await update(ref(db, `${DB_PATH}/modules/${mod}/pos`), { x, y });
    });
  });
}

export async function syncCanvasPositions() {
  const snap = await get(ref(db, `${DB_PATH}/modules`));
  if (!snap.exists()) return;
  const mods = snap.val();

  document.querySelectorAll(".overlay-box").forEach((box) => {
    const mod = box.dataset.module;
    const pos = mods?.[mod]?.pos;
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      box.style.left = `${pos.x}%`;
      box.style.top = `${pos.y}%`;
      box.dataset.x = String(pos.x);
      box.dataset.y = String(pos.y);
    }
  });
}
