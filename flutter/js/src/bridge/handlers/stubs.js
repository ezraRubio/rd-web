import { removePeer } from "../../helpers/peer_store";
import { LANGS } from "../../proto/gen_js_from_hbb";

const notImplemented = (name) => {
  console.warn(`[bridge stub] ${name} is not implemented on web`);
};

/** getByName handlers called by Flutter but not yet implemented for web. */
export const getStubHandlers = {
  my_name() {
    return "";
  },
  my_id() {
    return "";
  },
  uuid() {
    return "";
  },
  langs() {
    return JSON.stringify(Object.keys(LANGS));
  },
  build_date() {
    return "";
  },
  enable_trusted_devices() {
    return "";
  },
  local_os() {
    return "";
  },
  test_if_valid_server() {
    return "";
  },
};

/** setByName handlers called by Flutter but not yet implemented for web. */
export const setStubHandlers = {
  /** Upstream single-session API; use session_add_sync + session_start instead. */
  connect() {
    notImplemented("connect");
  },
  remove_peer(_ctx, value) {
    removePeer(value);
  },
  reconnect() {},
  save_ab(_ctx, _value) {
    notImplemented("save_ab");
  },
  clear_ab() {
    notImplemented("clear_ab");
  },
  load_ab() {
    notImplemented("load_ab");
  },
  save_group(_ctx, _value) {
    notImplemented("save_group");
  },
  clear_group() {
    notImplemented("clear_group");
  },
  load_group() {
    notImplemented("load_group");
  },
};
