import Websock, { IngressAction } from "./websock";
import * as message from "../proto/message.js";
import * as rendezvous from "../proto/rendezvous.js";
import { pushEvent } from "../helpers/push_event.js";
import { loadPeerOptions, savePeerOptions } from "../helpers/peer_store.js";
import {
  hashPassword,
  startPunchHole,
  connectRelay as connectRelayShared,
  ensureLoginSessionId,
} from "./session_connect";

/** Session capability tag used by bridge dispatch and session registry. */
export type SessionKind = "remote-desktop" | "file-transfer";

/**
 * Shared connection lifecycle for remote desktop and file transfer sessions.
 * Subclasses implement msgLoop(), login payload, and session-specific teardown.
 */
export abstract class BaseConnection {
  abstract readonly kind: SessionKind;

  _sessionId?: string;
  _msgs: message.Message[] = [];
  _ws: Websock | undefined;
  _interval: ReturnType<typeof setInterval> | undefined;
  _id = "";
  _hash: message.Hash | undefined;
  _password: Uint8Array | undefined;
  _plaintextPassword: string | undefined;
  _loginSessionId: number | undefined;
  _options: Record<string, any> = {};
  _peerInfo: message.PeerInfo | undefined;

  sid(): string | undefined {
    return this._sessionId;
  }

  ev(name: string, payload: Record<string, any>) {
    pushEvent(name, payload, this.sid());
  }

  setPeerId(id: string) {
    this._id = id;
  }

  setPlaintextPassword(pw: string) {
    this._plaintextPassword = pw;
  }

  protected prepareConnect(id: string) {
    this._id = id;
    this._options = loadPeerOptions(id) || this._options || {};
    if (!this._password) {
      const p = this.getOption("password");
      if (p) {
        try {
          this._password = Uint8Array.from(JSON.parse("[" + p + "]"));
        } catch (e) {
          console.error(e);
        }
      }
    }
    this.startMessagePump();
  }

  protected startMessagePump() {
    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => {
      while (this._msgs.length) {
        this._ws?.sendMessage(this._msgs.shift()!);
      }
    }, 1);
  }

  protected async establishConnection(
    connType: rendezvous.ConnType,
  ): Promise<boolean> {
    return startPunchHole(
      this._id,
      connType,
      (rr) => this.connectRelay(rr),
      (title, text) => this.reportConnectError(title, text),
    );
  }

  async connectRelay(rr: rendezvous.RelayResponse) {
    await connectRelayShared(rr, this._id, this.sid(), async (ws) => {
      this._ws = ws;
      ws.setIngressHandler((msg) => this.handleIngressMessage(msg));
      try {
        await this.msgLoop();
      } finally {
        ws.setIngressHandler(undefined);
      }
    });
  }

  protected abstract reportConnectError(title: string, text: string): void;
  abstract msgLoop(): Promise<void>;
  abstract msgbox(type_: string, title: string, text: string): void;
  abstract close(): void;
  abstract getRemember(): boolean;

  /** Echo keepalive pings before msgLoop can dequeue them (long FT/RD handlers). */
  protected handleIngressMessage(msg: message.Message): IngressAction {
    const test_delay = msg.test_delay;
    if (test_delay && !test_delay.from_client) {
      this._ws?.sendMessage({ test_delay });
      return "consume";
    }
    return "queue";
  }

  protected handleHashMessage() {
    if (this._plaintextPassword) {
      this.login(this._plaintextPassword);
      return;
    }
    if (this._password) {
      this.login();
      return;
    }
    this.onPasswordRequired();
  }

  protected abstract onPasswordRequired(): void;

  login(password?: string) {
    if (password) {
      const salt = this._hash?.salt;
      let p = hashPassword([password, salt!]);
      this._password = p;
      const challenge = this._hash?.challenge;
      p = hashPassword([p, challenge!]);
      this.msgbox("connecting", "Connecting...", "Logging in...");
      this._sendLoginMessage(p);
    } else {
      let p = this._password;
      if (p) {
        const challenge = this._hash?.challenge;
        p = hashPassword([p, challenge!]);
      }
      this._sendLoginMessage(p);
    }
  }

  protected abstract buildLoginRequest(
    password?: Uint8Array,
  ): message.LoginRequest;

  _sendLoginMessage(password?: Uint8Array) {
    const login_request = this.buildLoginRequest(password);
    this._ws?.sendMessage({ login_request });
  }

  protected persistPasswordIfRemembered() {
    if (!this.getRemember() || !this._password?.length) return;
    const p = this._password.toString();
    if (p != this.getOption("password")) {
      this.setOption("password", p);
    }
  }

  setOption(name: string, value: any) {
    if (value == undefined) {
      delete this._options[name];
    } else {
      this._options[name] = value;
    }
    this._options["tm"] = new Date().getTime();
    savePeerOptions(this._id, this._options);
  }

  getOption(name: string): any {
    return this._options[name];
  }

  queueMessage(msg: message.Message) {
    this._msgs.push(msg);
  }

  sendMessage(msg: message.Message) {
    this._ws?.sendMessage(msg);
  }

  getPlatform(): string {
    return this._peerInfo?.platform || "";
  }

  getStatus(): string {
    const open = this._ws && (this._ws as { _status?: string })._status === "open";
    return JSON.stringify({
      status_num: open ? 1 : 0,
      video_conn_count: 0,
    });
  }

  protected baseClose() {
    this._msgs = [];
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
    this._ws?.setIngressHandler(undefined);
    this._ws?.close();
  }
}

export { ensureLoginSessionId, hashPassword };
