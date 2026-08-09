import { PORT } from "../helpers/constants";
import { getEffectiveOption } from "./config";

function increasePort(host, offset) {
  function isIPv6(str) {
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
    return ipv6Pattern.test(str);
  }

  if (isIPv6(host)) {
    if (host.startsWith("[")) {
      let tmp = host.split("]:");
      if (tmp.length === 2) {
        let port = parseInt(tmp[1]) || 0;
        if (port > 0) {
          return `${tmp[0]}]:${port + offset}`;
        }
      }
    }
  } else if (host.includes(":")) {
    let tmp = host.split(":");
    if (tmp.length === 2) {
      let port = parseInt(tmp[1]) || 0;
      if (port > 0) {
        return `${tmp[0]}:${port + offset}`;
      }
    }
  }
  return host;
}

export function getAlternativeCodecs() {
  let vp9 = true;
  let av1 = false,
    h264 = false,
    h265 = false;
  try {
    const caps = RTCRtpSender.getCapabilities("video");
    for (const c of caps?.codecs ?? []) {
      const mt = c.mimeType.toLowerCase();
      if (mt.includes("av1")) av1 = true;
      if (mt.includes("h264")) h264 = true;
      if (mt.includes("h265")) h265 = true;
    }
  } catch (_) {}
  return JSON.stringify({ vp8: true, vp9, av1, h264, h265 });
}

export function getApiServer() {
  const api_server = getEffectiveOption("api-server");
  if (api_server) {
    return api_server;
  }

  const custom_rendezvous_server = getEffectiveOption(
    "custom-rendezvous-server",
  );
  if (custom_rendezvous_server) {
    let s = increasePort(custom_rendezvous_server, -2);
    if (s == custom_rendezvous_server) {
      return `http://${s}:${PORT - 2}`;
    } else {
      return `http://${s}`;
    }
  }
  return "https://admin.rustdesk.com";
}

export function getAuditServer(typ) {
  if (!getEffectiveOption("access_token")) {
    return "";
  }
  const api_server = getApiServer();
  if (!api_server || api_server.includes("rustdesk.com")) {
    return "";
  }
  return api_server + "/api/audit/" + typ;
}
