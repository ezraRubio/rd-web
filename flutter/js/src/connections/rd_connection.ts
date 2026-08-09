import * as message from "../proto/message.js";
import * as rendezvous from "../proto/rendezvous.js";
import { msgbox } from "../bridge/errors.js";
import { copyToClipboard } from "../helpers/storage.js";
import { initAudio, playAudio } from "../helpers/audio.js";
import { isDesktop } from "../helpers/mobile.js";
import { decompress, mapKey, sleep } from "../helpers/common";
import { BaseConnection, SessionKind } from "./session_base";
import { ensureLoginSessionId } from "./session_connect";
import {
  getOptionMessage,
  getImageQuality,
  getToggleOption,
  setImageQuality,
  toggleOption,
  togglePrivacyMode,
  changePreferCodec,
} from "./rd_options";
import { loadVideoDecoder, handleVideoFrame } from "./rd_video";

export default class RdConnection extends BaseConnection {
  readonly kind: SessionKind = "remote-desktop";

  _firstFrame: Boolean | undefined;
  _videoDecoder: any;
  _videoTestSpeed: number[];
  _lastKeyDownEvent: number | undefined;

  constructor() {
    super();
    this._videoTestSpeed = [0, 0];
  }

  async start(id?: string, password?: string) {
    if (id) this._id = id;
    if (password) this._plaintextPassword = password;
    try {
      await this._start(this._id);
    } catch (e: any) {
      this.msgbox(
        "error",
        "Connection Error",
        e.type == "close" ? "Reset by the peer" : String(e),
      );
    }
  }

  async _start(id: string) {
    this.prepareConnect(id);
    loadVideoDecoder(this);
    await this.establishConnection(rendezvous.ConnType.DEFAULT_CONN);
  }

  protected reportConnectError(title: string, text: string) {
    this.msgbox("error", title, text);
  }

  protected onPasswordRequired() {
    this.msgbox("input-password", "Password Required", "");
  }

  protected buildLoginRequest(
    password: Uint8Array | undefined = undefined,
  ): message.LoginRequest {
    return message.LoginRequest.fromPartial({
      username: this._id,
      my_id: "web",
      my_name: "web",
      password,
      session_id: ensureLoginSessionId(this),
      option: getOptionMessage(this),
      video_ack_required: true,
    });
  }

  async msgLoop() {
    console.log("Message loop started, waiting for messages...");
    let messageCount = 0;
    try {
      while (true) {
        const msg = (await this._ws?.next(0)) as message.Message;
        if (!msg) break;

        messageCount++;

        if (msg?.hash) {
          this._hash = msg?.hash;
          this.handleHashMessage();
        } else if (msg?.login_response) {
          const r = msg?.login_response;
          if (r.error) {
            if (r.error == "Wrong Password") {
              this._password = undefined;
              this.msgbox(
                "re-input-password",
                r.error,
                "Do you want to enter again?",
              );
            } else {
              this.msgbox("error", "Login Error", r.error);
            }
          } else if (r.peer_info) {
            this.handlePeerInfo(r.peer_info);
          }
        } else if (msg?.video_frame) {
          handleVideoFrame(this, msg.video_frame!);
        } else if (msg?.clipboard) {
          const cb = msg?.clipboard;
          if (cb.compress) {
            const c = await decompress(cb.content);
            if (!c) continue;
            cb.content = c;
          }
          try {
            copyToClipboard(new TextDecoder().decode(cb.content));
          } catch (e) {
            console.error(e);
          }
        } else if (msg?.cursor_data) {
          const cd = msg?.cursor_data;
          const c = await decompress(cd.colors);
          if (!c) continue;
          cd.colors = c;
          this.ev("cursor_data", cd);
        } else if (msg?.cursor_id) {
          this.ev("cursor_id", { id: msg?.cursor_id });
        } else if (msg?.cursor_position) {
          this.ev("cursor_position", msg?.cursor_position);
        } else if (msg?.misc) {
          if (!this.handleMisc(msg?.misc)) break;
        } else if (msg?.audio_frame) {
          playAudio(msg?.audio_frame.data);
        }
      }
    } catch (error) {
      console.error("Error type:", typeof error, "Value:", error);
      this.msgbox("error", "Connection Error", String(error));
    } finally {
      console.log(`Message loop ended after ${messageCount} messages`);
    }
  }

  msgbox(type_: string, title: string, text: string) {
    msgbox(type_, title, text);
  }

  close() {
    this.baseClose();
    this._videoDecoder?.close();
  }

  refresh() {
    const misc = message.Misc.fromPartial({ refresh_video: true });
    this._ws?.sendMessage({ misc });
  }

  handlePeerInfo(pi: message.PeerInfo) {
    this._peerInfo = pi;
    if (pi.displays.length == 0) {
      this.msgbox("error", "Remote Error", "No Display");
      return;
    }
    this.msgbox("success", "Successful", "Connected, waiting for image...");
    this.ev("peer_info", pi as any);
    const p = this.shouldAutoLogin();
    if (p) this.inputOsPassword(p);
    const username = this.getOption("info")?.username;
    if (username && !pi.username) pi.username = username;
    this.setOption("info", pi);
    if (this.getRemember()) {
      this.persistPasswordIfRemembered();
    } else {
      this.setOption("password", undefined);
    }
  }

  shouldAutoLogin(): string {
    const l = this.getOption("lock-after-session-end");
    const a = !!this.getOption("auto-login");
    const p = this.getOption("os-password");
    if (p && l && a) {
      return p;
    }
    return "";
  }

  handleMisc(misc: message.Misc) {
    if (misc.audio_format) {
      initAudio(misc.audio_format.channels, misc.audio_format.sample_rate);
    } else if (misc.chat_message) {
      this.ev("chat", { text: misc.chat_message.text });
    } else if (misc.permission_info) {
      const p = misc.permission_info;
      let name;
      switch (p.permission) {
        case message.PermissionInfo_Permission.Keyboard:
          name = "keyboard";
          break;
        case message.PermissionInfo_Permission.Clipboard:
          name = "clipboard";
          break;
        case message.PermissionInfo_Permission.Audio:
          name = "audio";
          break;
        default:
          return true;
      }
      this.ev("permission", { [name]: p.enabled });
    } else if (misc.switch_display) {
      this.ev("switch_display", misc.switch_display as any);
      const sd = misc.switch_display;
      if (this._peerInfo && this._peerInfo.displays) {
        const idx = sd.display;
        if (this._peerInfo.displays[idx]) {
          this._peerInfo.displays[idx].width = sd.width;
          this._peerInfo.displays[idx].height = sd.height;
        }
      }
      this.setOption("info", this._peerInfo);
    } else if (misc.close_reason) {
      this.msgbox("error", "Connection Error", misc.close_reason);
      this.close();
      return false;
    }
    return true;
  }

  getRemember(): boolean {
    return this._options["remember"] || false;
  }

  setRemember(v: boolean) {
    this.setOption("remember", v);
  }

  getToggleOption(name: string): boolean {
    return getToggleOption(this, name);
  }

  getImageQuality() {
    return getImageQuality(this);
  }

  setImageQuality(value: string) {
    setImageQuality(this, value);
  }

  toggleOption(name: string) {
    toggleOption(this, name);
  }

  togglePrivacyMode(value: string) {
    togglePrivacyMode(this, value);
  }

  changePreferCodec() {
    changePreferCodec(this);
  }

  inputKey(
    name: string,
    down: boolean,
    press: boolean,
    alt: Boolean,
    ctrl: Boolean,
    shift: Boolean,
    command: Boolean,
  ) {
    const key_event = mapKey(name, isDesktop());
    if (down && key_event) {
      this._lastKeyDownEvent = key_event.chr;
    }
    if (!down && !key_event.chr) {
      key_event.chr = this._lastKeyDownEvent;
      this._lastKeyDownEvent = undefined;
    }
    key_event.down = down;
    key_event.press = press;
    key_event.modifiers = this.getMod(alt, ctrl, shift, command);
    this._ws?.sendMessage({ key_event });
  }

  ctrlAltDel() {
    const key_event = message.KeyEvent.fromPartial({ down: true });
    if (this._peerInfo?.platform == "Windows") {
      key_event.control_key = message.ControlKey.CtrlAltDel;
    } else {
      key_event.control_key = message.ControlKey.Delete;
      key_event.modifiers = this.getMod(true, true, false, false);
    }
    this._ws?.sendMessage({ key_event });
  }

  inputString(seq: string) {
    const key_event = message.KeyEvent.fromPartial({ seq });
    this._ws?.sendMessage({ key_event });
  }

  switchDisplay(display: number) {
    const switch_display = message.SwitchDisplay.fromPartial({ display });
    const misc = message.Misc.fromPartial({ switch_display });
    this._ws?.sendMessage({ misc });
  }

  async inputOsPassword(seq: string) {
    this.inputMouse();
    await sleep(50);
    this.inputMouse(0, 3, 3);
    await sleep(50);
    this.inputMouse(1 | (1 << 3));
    this.inputMouse(2 | (1 << 3));
    await sleep(1200);
    const key_event = message.KeyEvent.fromPartial({ press: true, seq });
    this._ws?.sendMessage({ key_event });
  }

  lockScreen() {
    const key_event = message.KeyEvent.fromPartial({
      down: true,
      control_key: message.ControlKey.LockScreen,
    });
    this._ws?.sendMessage({ key_event });
  }

  getMod(alt: Boolean, ctrl: Boolean, shift: Boolean, command: Boolean) {
    const mod: message.ControlKey[] = [];
    if (alt) mod.push(message.ControlKey.Alt);
    if (ctrl) mod.push(message.ControlKey.Control);
    if (shift) mod.push(message.ControlKey.Shift);
    if (command) mod.push(message.ControlKey.Meta);
    return mod;
  }

  inputMouse(
    mask: number = 0,
    x: number = 0,
    y: number = 0,
    alt: Boolean = false,
    ctrl: Boolean = false,
    shift: Boolean = false,
    command: Boolean = false,
  ) {
    const mouse_event = message.MouseEvent.fromPartial({
      mask,
      x,
      y,
      modifiers: this.getMod(alt, ctrl, shift, command),
    });
    this._ws?.sendMessage({ mouse_event });
  }

  send2fa(value: string) {
    const misc = message.Misc.fromPartial({ chat_message: { text: value } });
    this._ws?.sendMessage({ misc });
  }

  elevateWithLogon(value: string) {
    try {
      const obj = JSON.parse(value);
      const misc = message.Misc.fromPartial({
        elevation_request: {
          logon: obj,
        },
      });
      this._ws?.sendMessage({ misc });
    } catch (e) {
      console.error("Failed to elevate with logon:", e);
    }
  }

  restart() {
    this.close();
    this.start(this._id);
  }
}
