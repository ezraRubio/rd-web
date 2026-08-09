import { getEffectiveOption } from "../../helpers/config";
import { translate } from "../../helpers/common";
import { version } from "../../proto/gen_js_from_hbb";
import { getUserDefaultOption, getPeerOption } from "../../helpers/options";
import {
  loadRecentPeers,
  loadFavPeers,
  getRecentPeers,
} from "../../helpers/peers";
import { peerExists, peerHasPassword } from "../../helpers/peer_store";
import {
  getApiServer,
  getAuditServer,
  getAlternativeCodecs,
} from "../../helpers/server_config";
import { getVersionNumber } from "../../helpers/version";

export const getStorageHandlers = {
  "app-name"() {
    return localStorage.getItem("app-name") || "";
  },
  remote_id() {
    return localStorage.getItem("remote-id");
  },
  remember(ctx) {
    return ctx.curConn?.getRemember?.() ?? false;
  },
  toggle_option(ctx, arg) {
    return ctx.curConn?.getOption?.(arg) || false;
  },
  option(_ctx, arg) {
    return localStorage.getItem(arg);
  },
  options() {
    const keys = [
      "custom-rendezvous-server",
      "relay-server",
      "api-server",
      "key",
    ];
    const obj = {};
    keys.forEach((key) => {
      const v = getEffectiveOption(key);
      if (v) obj[key] = v;
    });
    return JSON.stringify(obj);
  },
  "option:local"(ctx, arg) {
    return localStorage.getItem("option:local:" + arg);
  },
  "option:flutter:local"(ctx, arg) {
    return localStorage.getItem("option:flutter:local:" + arg);
  },
  "option:flutter:peer"(ctx, arg) {
    return localStorage.getItem("option:flutter:peer:" + arg);
  },
  translate(_ctx, arg) {
    arg = JSON.parse(arg);
    return translate(arg.locale, arg.text);
  },
  "option:user:default"(_ctx, arg) {
    return getUserDefaultOption(arg);
  },
  "option:session"(ctx, arg) {
    return ctx.curConn?.getOption(arg) ?? getUserDefaultOption(arg);
  },
  platform(ctx) {
    return ctx.curConn?.getPlatform?.() || "";
  },
  hostname(ctx) {
    return (
      ctx.curConn?.getOption?.("info")?.hostname ||
      ctx.curConn?._peerInfo?.hostname ||
      ""
    );
  },
  conn_token(ctx) {
    return ctx.connToken();
  },
  "option:peer"(_ctx, arg) {
    return getPeerOption(arg);
  },
  version() {
    return version;
  },
  load_recent_peers() {
    loadRecentPeers();
  },
  load_fav_peers() {
    loadFavPeers();
  },
  fav() {
    return localStorage.getItem("fav") ?? "[]";
  },
  load_recent_peers_sync() {
    return JSON.stringify({
      peers: JSON.stringify(getRecentPeers()),
    });
  },
  api_server() {
    return getApiServer();
  },
  is_using_public_server() {
    return !getEffectiveOption("custom-rendezvous-server");
  },
  get_version_number(_ctx, arg) {
    return getVersionNumber(arg);
  },
  audit_server(_ctx, arg) {
    return getAuditServer(arg);
  },
  alternative_codecs() {
    return getAlternativeCodecs();
  },
  peer_has_password(_ctx, arg) {
    return peerHasPassword(arg);
  },
  peer_exists(_ctx, arg) {
    return peerExists(arg);
  },
  screen_info() {
    return JSON.stringify({
      frame: {
        l: window.screenX,
        t: window.screenY,
        r: window.screenX + window.innerWidth,
        b: window.screenY + window.innerHeight,
      },
      visibleFrame: {
        l: window.screen.availLeft,
        t: window.screen.availTop,
        r: window.screen.availLeft + window.screen.availWidth,
        b: window.screen.availTop + window.screen.availHeight,
      },
      scaleFactor: window.devicePixelRatio,
    });
  },
  main_display() {
    return JSON.stringify({
      w: window.screen.availWidth,
      h: window.screen.availHeight,
      scaleFactor: window.devicePixelRatio,
    });
  },
};
