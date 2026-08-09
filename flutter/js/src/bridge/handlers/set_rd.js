import { withRd, dispatchRdInputKey } from "./helpers.js";

export const setRdHandlers = {
  refresh(ctx) {
    ctx.rd()?.refresh();
  },
  toggle_option(ctx, value) {
    ctx.rd()?.toggleOption(value);
  },
  toggle_privacy_mode(ctx, value) {
    ctx.rd()?.togglePrivacyMode(value);
  },
  image_quality(ctx, value) {
    ctx.rd()?.setImageQuality(value);
  },
  lock_screen(ctx) {
    ctx.rd()?.lockScreen();
  },
  ctrl_alt_del(ctx) {
    ctx.rd()?.ctrlAltDel();
  },
  switch_display(ctx, value) {
    ctx.rd()?.switchDisplay(value);
  },
  input_key(ctx, value) {
    dispatchRdInputKey(ctx.rd(), value);
  },
  input_string(ctx, value) {
    ctx.rd()?.inputString(value);
  },
  send_mouse(ctx, value) {
    withRd(ctx, (conn, data) => {
      let mask = 0;
      switch (data.type) {
        case "down":
          mask = 1;
          break;
        case "up":
          mask = 2;
          break;
        case "wheel":
          mask = 3;
          break;
      }
      switch (data.buttons) {
        case "left":
          mask |= 1 << 3;
          break;
        case "right":
          mask |= 2 << 3;
          break;
        case "wheel":
          mask |= 4 << 3;
      }
      conn.inputMouse(
        mask,
        parseInt(data.x || "0"),
        parseInt(data.y || "0"),
        data.alt == "true",
        data.ctrl == "true",
        data.shift == "true",
        data.command == "true",
      );
    }, value);
  },
  send_2fa(ctx, value) {
    ctx.rd()?.send2fa(value);
  },
  input_os_password(ctx, value) {
    ctx.rd()?.inputOsPassword(value);
  },
  elevate_with_logon(ctx, value) {
    ctx.rd()?.elevateWithLogon(value);
  },
  restart(ctx) {
    ctx.rd()?.restart();
  },
  change_prefer_codec(ctx) {
    ctx.rd()?.changePreferCodec();
  },
  "option:toggle"(ctx, value) {
    return setRdHandlers.toggle_option(ctx, value);
  },
};
