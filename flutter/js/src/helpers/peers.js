import { getPeers } from "./storage";

function getRecentPeers() {
  const peers = [];
  for (const [id, value] of Object.entries(getPeers())) {
    if (!id) continue;
    const tm = value["tm"];
    const info = value["info"];
    const cardInfo = {
      id: id,
      username: info["username"] || "",
      hostname: info["hostname"] || "",
      platform: info["platform"] || "",
      alias: value.alias || "",
    };
    if (!tm || !cardInfo) continue;
    peers.push([tm, id, cardInfo]);
  }
  return peers
    .sort()
    .reverse()
    .map((x) => x[2]);
}

export function loadRecentPeers() {
  const peersRecent = getRecentPeers();
  if (peersRecent) {
    onRegisteredEvent(
      JSON.stringify({
        name: "load_recent_peers",
        peers: JSON.stringify(peersRecent),
      }),
    );
  }
}

export function loadFavPeers() {
  try {
    const fav = localStorage.getItem("fav") ?? "[]";
    const favs = JSON.parse(fav);
    const peersFav = getRecentPeers().filter((x) => favs.includes(x.id));
    if (peersFav) {
      onRegisteredEvent(
        JSON.stringify({
          name: "load_fav_peers",
          peers: JSON.stringify(peersFav),
        }),
      );
    }
  } catch (e) {
    console.error("Failed to load fav peers: " + e.message);
  }
}

// Unused stub: bridge dispatches query_onlines but this is not implemented.
export function queryOnlines(value) {
  // TODO: implement this
}

export { getRecentPeers };
