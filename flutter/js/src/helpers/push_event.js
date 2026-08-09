/** Neutral Flutter event dispatch (no bridge or connection imports). */

function jsonfyForDart(payload) {
  var tmp = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!key) continue;
    if (value instanceof String || typeof value == "string") {
      tmp[key] = value;
    } else if (value instanceof Uint8Array) {
      tmp[key] = "[" + value.toString() + "]";
    } else {
      tmp[key] = JSON.stringify(value);
    }
  }
  return tmp;
}

export function pushEvent(name, payload, sessionId) {
  payload = jsonfyForDart(payload);
  payload.name = name;
  if (sessionId) payload.session_id = sessionId;
  onGlobalEvent(JSON.stringify(payload));
}
