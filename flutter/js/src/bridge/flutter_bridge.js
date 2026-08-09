import { bridgeContext } from "./handlers/bridge_context.js";
import { dispatchSetByName, dispatchGetByName } from "./handlers/dispatch.js";

window.setByName = (name, value, sessionId) => {
  return dispatchSetByName(name, value, bridgeContext(sessionId));
};

window.getByName = (name, arg, sessionId) => {
  let v = dispatchGetByName(name, arg, bridgeContext(sessionId));
  if (typeof v == "string" || v instanceof String) return v;
  if (v == undefined || v == null) return "";
  return JSON.stringify(v);
};
