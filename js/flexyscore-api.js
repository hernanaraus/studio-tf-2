const FLEXY_DISPATCHER_URL = "https://www.live.flexyscore.net/dirette/in_dispatchers/apidispatcher.php";

let lastSignature = "";

/**
 * Envía actualizaciones de marcador a Flexyscore API Dispatcher.
 * @param {string} liveid - Token de integración de Flexyscore
 * @param {object} payloadData - Campos del marcador (points_1, points_2, fouls_1, fouls_2, moment, timer, etc.)
 * @param {boolean} force - Envía aunque el payload coincida con el último enviado
 */
export async function pushToFlexyscore(liveid, payloadData = {}, force = false) {
  const token = String(liveid || "").trim();
  if (!token) {
    throw new Error("Debes ingresar el Token (liveid) de Flexyscore.");
  }

  const rawEntries = {
    liveid: token,
    ...(payloadData.team_1 !== undefined ? { team_1: String(payloadData.team_1) } : {}),
    ...(payloadData.team_2 !== undefined ? { team_2: String(payloadData.team_2) } : {}),
    ...(payloadData.points_1 !== undefined ? { points_1: Number(payloadData.points_1) || 0 } : {}),
    ...(payloadData.points_2 !== undefined ? { points_2: Number(payloadData.points_2) || 0 } : {}),
    ...(payloadData.fouls_1 !== undefined ? { fouls_1: Number(payloadData.fouls_1) || 0 } : {}),
    ...(payloadData.fouls_2 !== undefined ? { fouls_2: Number(payloadData.fouls_2) || 0 } : {}),
    ...(payloadData.moment !== undefined ? { moment: Number(payloadData.moment) || 1 } : {}),
    ...(payloadData.overtime !== undefined ? { overtime: payloadData.overtime ? 1 : 0 } : {}),
    ...(payloadData.timer !== undefined ? { timer: Number(payloadData.timer) || 0 } : {}),
    ...(payloadData.user_signal !== undefined ? { user_signal: payloadData.user_signal ? 1 : 0 } : {}),
    ...(payloadData.timeouts_1 !== undefined ? { timeouts_1: Number(payloadData.timeouts_1) || 0 } : {}),
    ...(payloadData.timeouts_2 !== undefined ? { timeouts_2: Number(payloadData.timeouts_2) || 0 } : {}),
    ...(payloadData.bonus_1 !== undefined ? { bonus_1: payloadData.bonus_1 ? 1 : 0 } : {}),
    ...(payloadData.bonus_2 !== undefined ? { bonus_2: payloadData.bonus_2 ? 1 : 0 } : {}),
    ...(payloadData.generictoggle !== undefined ? { generictoggle: payloadData.generictoggle ? 1 : 0 } : {})
  };

  const { liveid: _ignored, ...comparable } = rawEntries;
  const signature = JSON.stringify(comparable);

  if (!force && signature === lastSignature) {
    return { skipped: true, message: "Sin cambios respecto al último envío." };
  }

  const body = new URLSearchParams(
    Object.fromEntries(Object.entries(rawEntries).map(([k, v]) => [k, String(v)]))
  ).toString();

  const res = await fetch(FLEXY_DISPATCHER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} en Flexyscore Dispatcher`);
  }

  lastSignature = signature;
  return await res.json();
}
