import { getPeers } from "./storage";

/** Load persisted options for a peer id (empty object if none). */
export function loadPeerOptions(peerId) {
  if (!peerId) return {};
  return getPeers()[peerId] || {};
}

function writePeers(peers) {
  localStorage.setItem("peers", JSON.stringify(peers));
}

/** Persist full options blob for a peer (sets `tm` timestamp). */
export function savePeerOptions(peerId, options) {
  const peers = getPeers();
  options["tm"] = new Date().getTime();
  peers[peerId] = options;
  writePeers(peers);
}

export function removePeer(peerId) {
  const peers = getPeers();
  delete peers[peerId];
  writePeers(peers);
}

export function peerExists(peerId) {
  return !!getPeers()[peerId];
}

export function peerHasPassword(peerId) {
  const options = loadPeerOptions(peerId);
  return (options["password"] ?? "") !== "";
}

/** Update one field on a peer record (used by bridge option:peer). */
export function setPeerField(peerId, name, value) {
  const options = loadPeerOptions(peerId);
  if (value == undefined) {
    delete options[name];
  } else {
    options[name] = value;
  }
  savePeerOptions(peerId, options);
  return options;
}
