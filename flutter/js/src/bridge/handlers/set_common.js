import { close } from "../connection_lifecycle";
import { setUserDefaultOption, setPeerOption } from "../../helpers/options";
import { queryOnlines } from "../../helpers/peers";
import { removePeer } from "../../helpers/peer_store";
import { sessionAdd, sessionStart, sessionClose } from "../session_handlers";
import { dispatchRdInputKey } from "./helpers.js";

function setCustomCursor(value) {
  try {
    const obj = JSON.parse(value);
    var body = document.body;
    for (var i = 0; i < body.children.length; i++) {
      var child = body.children[i];
      if (child.tagName == "FLUTTER-VIEW") {
        child.style.cursor = `url(${obj.url}) ${obj.hotx} ${obj.hoty}, auto`;
      }
    }
  } catch (e) {
    console.error("Failed to set custom cursor: " + e.message);
  }
}

function setNamespacedLocalOption(name, value) {
  value = JSON.parse(value);
  localStorage.setItem(name + ":" + value.name, value.value);
}

/** Session, storage, and shared setByName handlers. */
export const setCommonHandlers = {
  remote_id(_ctx, value) {
    localStorage.setItem("remote-id", value);
  },
  login(ctx, value) {
    const curConn = ctx.curConn;
    if (!curConn) return;
    value = JSON.parse(value);
    curConn.setRemember(value.remember);
    if (value.os_username) {
      console.error("os login not implemented, escaping");
      return;
    }
    curConn.login(value.password);
  },
  close() {
    close();
  },
  option(_ctx, value) {
    value = JSON.parse(value);
    localStorage.setItem(value.name, value.value);
  },
  options(_ctx, value) {
    value = JSON.parse(value);
    for (const [key, val] of Object.entries(value)) {
      localStorage.setItem(key, val);
    }
  },
  "option:local"(_ctx, value) {
    setNamespacedLocalOption("option:local", value);
  },
  "option:flutter:local"(_ctx, value) {
    setNamespacedLocalOption("option:flutter:local", value);
  },
  "option:flutter:peer"(_ctx, value) {
    setNamespacedLocalOption("option:flutter:peer", value);
  },
  "option:user:default"(_ctx, value) {
    setUserDefaultOption(value);
  },
  "option:session"(ctx, value) {
    value = JSON.parse(value);
    ctx.curConn?.setOption(value.name, value.value);
  },
  "option:peer"(_ctx, value) {
    setPeerOption(value);
  },
  remove(_ctx, value) {
    removePeer(value);
  },
  forget(ctx) {
    ctx.curConn?.setRemember(false);
  },
  fav(_ctx, value) {
    return localStorage.setItem("fav", value);
  },
  query_onlines(_ctx, value) {
    queryOnlines(value);
  },
  cursor(_ctx, value) {
    setCustomCursor(value);
  },
  session_add_sync(_ctx, value) {
    return sessionAdd(value);
  },
  session_start(_ctx, value) {
    sessionStart(value);
  },
  session_close(_ctx, value) {
    sessionClose(value);
  },
  flutter_key_event(ctx, value) {
    dispatchRdInputKey(ctx.rd(), value, { mapFlutterKey: true });
  },
};
