/** Shared helpers for bridge setByName handlers. */

export function parseJson(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

export function withFt(ctx, fn, value) {
  const conn = ctx.ft();
  if (!conn) return;
  return fn(conn, parseJson(value));
}

export function withRd(ctx, fn, value) {
  const conn = ctx.rd();
  if (!conn) return;
  if (value === undefined) return fn(conn);
  return fn(conn, parseJson(value));
}

export function physicalButtonsMap(hid) {
  switch (hid) {
    case 102:
      return "Power";
    case 128:
      return "VolumeUp";
    case 129:
      return "VolumeDown";
    default:
      return "unknown";
  }
}

export function dispatchRdInputKey(rd, value, { mapFlutterKey = false } = {}) {
  if (!rd) return;
  const v = parseJson(value);
  let name = v.name;
  if (mapFlutterKey && name === "flutter_key") {
    name = physicalButtonsMap(v.usb_hid || 0);
  }
  rd.inputKey(
    name,
    v.down == "true",
    v.press == "true",
    v.alt == "true",
    v.ctrl == "true",
    v.shift == "true",
    v.command == "true",
  );
}
