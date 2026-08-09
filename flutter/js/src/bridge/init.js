import { loadCustomConfig } from "../helpers/config";
import { initZstd } from "../helpers/common";
import { loadVp9 } from "../helpers/codec";
import { bindOpusWorkerOnInit } from "../helpers/audio";
import { decryptToken } from "../helpers/viewer-crypto";
import { showFatalError } from "./errors";

let _connectReadyResolve;
const _connectReadyPromise = new Promise((resolve) => {
  _connectReadyResolve = resolve;
});

let _connectImpl;
Object.defineProperty(window, "connect", {
  set(fn) {
    _connectImpl = fn;
    _connectReadyResolve();
  },
  get() {
    return _connectImpl;
  },
});

window.addEventListener("message", async (e) => {
  if (!e.data || typeof e.data !== "object") return;
  const { type, remoteSessionId, clientId, encryptedToken, server, key } =
    e.data;
  if (type !== "REMOTE_SESSION_READY") return;
  if (!remoteSessionId || !clientId || !encryptedToken || !server || !key) {
    return;
  }
  if (window.__sessionStarted) return;
  if (e.origin !== window.__parentOrigin || e.source !== window.opener) {
    return;
  }
  if (!window.__viewerPrivateKey) {
    console.error("REMOTE_SESSION_READY: missing viewer private key");
    showFatalError("Error", "viewer not initialized", "error");
    e.source.postMessage(
      { type: "ACK", result: false, error: "viewer not initialized" },
      e.origin,
    );
    return;
  }

  window.__sessionStarted = true;
  localStorage.setItem("override:custom-rendezvous-server", server);
  localStorage.setItem("override:key", key);
  try {
    const token = await decryptToken(window.__viewerPrivateKey, encryptedToken);
    await _connectReadyPromise;
    const result = await _connectImpl(clientId, token, remoteSessionId);
    e.source.postMessage({ type: "ACK", result: !!result }, e.origin);
  } catch (err) {
    console.error("REMOTE_SESSION_READY failed:", err);
    showFatalError("Error", err.message || String(err), "error");
    e.source.postMessage(
      { type: "ACK", result: false, error: err.message },
      e.origin,
    );
  }
});

window.init = async () => {
  await loadCustomConfig();
  bindOpusWorkerOnInit();
  loadVp9(() => {});
  await initZstd();
  window.onInitFinished?.();
};
