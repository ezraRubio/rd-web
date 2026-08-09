import * as message from "../proto/message.js";
import * as rendezvous from "../proto/rendezvous.js";
import { encrypt, decrypt } from "../helpers/crypto_sodium.js";

type Keys = "message" | "open" | "close" | "error";

export type IngressAction = "queue" | "consume";

export default class Websock {
  _websocket: WebSocket;
  _eventHandlers: { [key in Keys]: Function };
  _buf: (rendezvous.RendezvousMessage | message.Message)[];
  _status: any;
  _latency: number;
  _secretKey: [Uint8Array, number, number] | undefined;
  _uri: string;
  _isRendezvous: boolean;
  _ingressHandler?: (msg: message.Message) => IngressAction;

  constructor(uri: string, isRendezvous: boolean = true) {
    this._eventHandlers = {
      message: (_: any) => {},
      open: () => {},
      close: () => {},
      error: () => {},
    };
    this._uri = uri;
    this._status = "";
    this._buf = [];
    this._websocket = new WebSocket(uri);
    this._websocket.onmessage = this._recv_message.bind(this);
    this._websocket.binaryType = "arraybuffer";
    this._latency = new Date().getTime();
    this._isRendezvous = isRendezvous;
  }

  setSecretKey(key: Uint8Array) {
    this._secretKey = [key, 0, 0];
  }

  sendMessage(json: message.DeepPartial<message.Message>) {
    let data = message.Message.encode(
      message.Message.fromPartial(json),
    ).finish();
    let k = this._secretKey;
    if (k) {
      k[1] += 1;
      data = encrypt(data, k[1], k[0]);
    }
    this._websocket.send(data);
  }

  sendRendezvous(data: rendezvous.DeepPartial<rendezvous.RendezvousMessage>) {
    this._websocket.send(
      rendezvous.RendezvousMessage.encode(
        rendezvous.RendezvousMessage.fromPartial(data),
      ).finish(),
    );
  }

  parseMessage(data: Uint8Array) {
    return message.Message.decode(data);
  }

  parseRendezvous(data: Uint8Array) {
    return rendezvous.RendezvousMessage.decode(data);
  }

  setIngressHandler(
    handler: ((msg: message.Message) => IngressAction) | undefined,
  ) {
    this._ingressHandler = handler;
  }

  async open(timeout: number = 12000): Promise<Websock> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this._status != "open") {
          reject(this._status || "Timeout");
        }
      }, timeout);
      this._websocket.onopen = () => {
        this._latency = new Date().getTime() - this._latency;
        this._status = "open";
        if (this._websocket?.protocol) {
          console.info(
            "Server choose sub-protocol: " + this._websocket.protocol,
          );
        }

        this._eventHandlers.open();
        resolve(this);
      };
      this._websocket.onclose = (e) => {
        if (this._status == "open") {
          //
        }
        this._status = e;
        this._eventHandlers.close(e);
        reject("Reset by the peer");
      };
      this._websocket.onerror = (e: any) => {
        console.error(
          "\n websocket current status: " +
            this._status +
            "\n WebSock.onerror: ",
        );
        console.error(e);
        if (!this._status) {
          reject(
            "Failed to connect to " +
              (this._isRendezvous ? "rendezvous" : "relay") +
              " server",
          );
          return;
        }
        this._status = e;
        this._eventHandlers.error(e);
      };
    });
  }

  async next(
    timeout = 12000,
  ): Promise<rendezvous.RendezvousMessage | message.Message> {
    const func = (
      resolve: (value: rendezvous.RendezvousMessage | message.Message) => void,
      reject: (reason: any) => void,
      tm0: number,
    ) => {
      if (this._buf.length) {
        resolve(this._buf[0]);
        this._buf.splice(0, 1);
      } else {
        if (this._status != "open") {
          reject(this._status);
          return;
        }
        if (timeout > 0 && new Date().getTime() > tm0 + timeout) {
          reject("Timeout");
        } else {
          setTimeout(() => func(resolve, reject, tm0), 1);
        }
      }
    };
    return new Promise((resolve, reject) => {
      func(resolve, reject, new Date().getTime());
    });
  }

  close() {
    this._ingressHandler = undefined;
    this._status = "";
    if (this._websocket) {
      if (
        this._websocket.readyState === WebSocket.OPEN ||
        this._websocket.readyState === WebSocket.CONNECTING
      ) {
        this._websocket.close();
      }

      this._websocket.onmessage = () => {};
    }
  }

  _recv_message(e: any) {
    if (e.data instanceof window.ArrayBuffer) {
      let bytes = new Uint8Array(e.data);
      const k = this._secretKey;
      if (k) {
        k[2] += 1;
        bytes = decrypt(bytes, k[2], k[0]);
      }
      if (this._isRendezvous) {
        this._buf.push(this.parseRendezvous(bytes));
      } else {
        const msg = this.parseMessage(bytes);
        if (this._ingressHandler?.(msg) === "consume") {
          this._eventHandlers.message(e.data);
          return;
        }
        this._buf.push(msg);
      }
    }
    this._eventHandlers.message(e.data);
  }
}
