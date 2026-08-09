import { checkIfRetry } from "../proto/gen_js_from_hbb";
import { formatErrorMessage } from "../helpers/format_error";
import {
  endFileTransferSession,
  hasOpenRemoteDesktopSession,
} from "../connections/sessions";
import { close } from "./conn_registry";

function getParentTarget() {
  if (window.__parentOrigin && window.opener) return window.opener;
  if (window.__parentOrigin && window.parent !== window) return window.parent;
  return null;
}

export function notifyParentError(title, message, msgboxType = "error") {
  const target = getParentTarget();
  if (!target || !window.__parentOrigin) return;
  const cleanTitle = formatErrorMessage(title, "Error");
  const cleanMessage = formatErrorMessage(message, cleanTitle);
  target.postMessage(
    {
      type: "VIEWER_ERROR",
      title: cleanTitle,
      message: cleanMessage,
      msgboxType: typeof msgboxType === "string" ? msgboxType : "error",
    },
    window.__parentOrigin,
  );
}

function notifyFlutterFatalCleanup() {
  onGlobalEvent(JSON.stringify({ name: "viewer_fatal" }));
}

export function showFatalError(title, text, msgboxType = "error") {
  const cur = window.curConn;
  if (cur?.kind === "file-transfer" && hasOpenRemoteDesktopSession()) {
    endFileTransferSession(cur.sid?.(), {
      title,
      message: text || title,
    });
    return;
  }
  close();
  notifyParentError(title, text || title, msgboxType);
  notifyFlutterFatalCleanup();
  try {
    window.close();
  } catch (_) {}
}

const PARENT_IGNORE_MSGBOX_TYPES = new Set(["connecting", "success"]);

function isParentHandledMsgbox(type, title, text, retry) {
  if (!type || PARENT_IGNORE_MSGBOX_TYPES.has(type)) return false;
  if (type === "error") return true;
  if (
    type === "re-input-password" ||
    type === "input-password" ||
    type === "input-2fa" ||
    type.startsWith("session-login")
  ) {
    return true;
  }
  if (
    type === "relay-hint" ||
    type === "relay-hint2" ||
    type === "elevation-error" ||
    type === "wait-remote-accept-nook" ||
    type === "on-uac" ||
    type === "on-foreground-elevated" ||
    type === "wait-uac" ||
    type === "restarting"
  ) {
    return true;
  }
  if (title === "Privacy mode") return true;
  if (type.includes("error")) return true;
  if (retry) return true;
  return false;
}

export function msgbox(type, title, text, link) {
  if (!type || (type == "error" && !text)) return;
  const retry = checkIfRetry(type, title, text);
  if (isParentHandledMsgbox(type, title, text, retry)) {
    showFatalError(title, text || title, type);
    return;
  }
  onGlobalEvent(
    JSON.stringify({
      name: "msgbox",
      type,
      title,
      text,
      link: link ?? "",
      hasRetry: retry ? "true" : "",
    }),
  );
}
