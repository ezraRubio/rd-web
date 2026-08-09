import type RdConnection from "./rd_connection";
import * as message from "../proto/message.js";

export function getOptionMessage(
  conn: RdConnection,
): message.OptionMessage | undefined {
  let n = 0;
  const msg = message.OptionMessage.fromPartial({});
  const q = getImageQualityEnum(conn.getImageQuality(), true);
  const yes = message.OptionMessage_BoolOption.Yes;
  if (q != undefined) {
    msg.image_quality = q;
    n += 1;
  }
  if (conn._options["show-remote-cursor"]) {
    msg.show_remote_cursor = yes;
    n += 1;
  }
  if (conn._options["lock-after-session-end"]) {
    msg.lock_after_session_end = yes;
    n += 1;
  }
  if (conn._options["privacy-mode"]) {
    msg.privacy_mode = yes;
    n += 1;
  }
  if (conn._options["disable-audio"]) {
    msg.disable_audio = yes;
    n += 1;
  }
  if (conn._options["disable-clipboard"]) {
    msg.disable_clipboard = yes;
    n += 1;
  }
  return n > 0 ? msg : undefined;
}

export function getImageQuality(conn: RdConnection) {
  return conn.getOption("image-quality");
}

export function getImageQualityEnum(
  value: string,
  ignoreDefault: Boolean,
): message.ImageQuality | undefined {
  switch (value) {
    case "low":
      return message.ImageQuality.Low;
    case "best":
      return message.ImageQuality.Best;
    case "balanced":
      return ignoreDefault ? undefined : message.ImageQuality.Balanced;
    default:
      return undefined;
  }
}

export function setImageQuality(conn: RdConnection, value: string) {
  conn.setOption("image-quality", value);
  const image_quality = getImageQualityEnum(value, false);
  if (image_quality == undefined) return;
  const option = message.OptionMessage.fromPartial({ image_quality });
  const misc = message.Misc.fromPartial({ option });
  conn._ws?.sendMessage({ misc });
}

export function toggleOption(conn: RdConnection, name: string) {
  const v = !conn._options[name];
  const option = message.OptionMessage.fromPartial({});
  const v2 = v
    ? message.OptionMessage_BoolOption.Yes
    : message.OptionMessage_BoolOption.No;
  switch (name) {
    case "show-remote-cursor":
      option.show_remote_cursor = v2;
      break;
    case "disable-audio":
      option.disable_audio = v2;
      break;
    case "disable-clipboard":
      option.disable_clipboard = v2;
      break;
    case "lock-after-session-end":
      option.lock_after_session_end = v2;
      break;
    case "privacy-mode":
      option.privacy_mode = v2;
      break;
    case "block-input":
      option.block_input = message.OptionMessage_BoolOption.Yes;
      break;
    case "unblock-input":
      option.block_input = message.OptionMessage_BoolOption.No;
      break;
    case "view-only":
      option.disable_keyboard = v ? v2 : message.OptionMessage_BoolOption.No;
      option.disable_clipboard = v ? v2 : message.OptionMessage_BoolOption.No;
      option.show_remote_cursor = v
        ? v2
        : message.OptionMessage_BoolOption.No;
      option.enable_file_transfer = v
        ? v2
        : message.OptionMessage_BoolOption.Yes;
      option.lock_after_session_end = v
        ? v2
        : message.OptionMessage_BoolOption.Yes;
      break;
    default:
      return;
  }
  if (name.indexOf("block-input") < 0) conn.setOption(name, v);
  const misc = message.Misc.fromPartial({ option });
  conn._ws?.sendMessage({ misc });
}

export function togglePrivacyMode(conn: RdConnection, value: string) {
  const option = message.OptionMessage.fromPartial({
    privacy_mode:
      value === "true"
        ? message.OptionMessage_BoolOption.Yes
        : message.OptionMessage_BoolOption.No,
  });
  const misc = message.Misc.fromPartial({ option });
  conn._ws?.sendMessage({ misc });
}

export function changePreferCodec(conn: RdConnection) {
  const pref = conn._options["codec-preference"] || "auto";
  const map: Record<string, message.SupportedDecoding_PreferCodec> = {
    auto: message.SupportedDecoding_PreferCodec.Auto,
    vp8: message.SupportedDecoding_PreferCodec.VP8,
    vp9: message.SupportedDecoding_PreferCodec.VP9,
    av1: message.SupportedDecoding_PreferCodec.AV1,
    h264: message.SupportedDecoding_PreferCodec.H264,
    h265: message.SupportedDecoding_PreferCodec.H265,
  };
  const preferCodec = map[pref] ?? message.SupportedDecoding_PreferCodec.Auto;
  const option = message.OptionMessage.fromPartial({
    supported_decoding: message.SupportedDecoding.fromPartial({
      prefer: preferCodec,
    }),
  });
  const misc = message.Misc.fromPartial({ option });
  conn._ws?.sendMessage({ misc });
}

export function getToggleOption(conn: RdConnection, name: string): boolean {
  return conn._options[name] || false;
}
