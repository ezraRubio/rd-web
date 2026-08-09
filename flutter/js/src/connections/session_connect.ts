import Websock from "./websock";
import * as sha256 from "fast-sha256";
import * as message from "../proto/message.js";
import * as rendezvous from "../proto/rendezvous.js";
import {
  verify,
  genBoxKeyPair,
  genSecretKey,
  seal,
} from "../helpers/crypto_sodium.js";
import { pushEvent } from "../helpers/push_event.js";
import { msgbox } from "../bridge/errors.js";
import { getEffectiveOption } from "../helpers/config";
import { PORT } from "../helpers/constants";

export { PORT };

export function hashPassword(datas: (string | Uint8Array)[]): Uint8Array {
  const hasher = new sha256.Hash();
  datas.forEach((data) => {
    if (typeof data == "string") {
      data = new TextEncoder().encode(data);
    }
    hasher.update(data);
  });
  return hasher.digest();
}

export function ensureLoginSessionId(conn: {
  _loginSessionId?: number;
}): number {
  if (!conn._loginSessionId) {
    let sid = (Math.random() * 0xffffffff) >>> 0;
    if (sid === 0) sid = 1;
    conn._loginSessionId = sid;
  }
  return conn._loginSessionId;
}

export function getDefaultUri(isRelay = false): string {
  const host = getEffectiveOption("custom-rendezvous-server");
  return getrUriFromRs(host, isRelay);
}

export function getrUriFromRs(
  uri: string,
  isRelay = false,
  roffset = 0,
): string {
  const domain = window.location.hostname;
  if (uri.indexOf(":") > 0) {
    const tmp = uri.split(":");
    const port = parseInt(tmp[1]);
    uri = tmp[0] + ":" + (port + (isRelay ? roffset || 3 : 2));
    return "wss://" + domain;
  }
  return "wss://" + domain + (isRelay ? "/ws/relay" : "/ws/id");
}

export function punchHoleFailureMessage(
  failure: rendezvous.PunchHoleResponse_Failure,
): string {
  switch (failure) {
    case rendezvous.PunchHoleResponse_Failure.ID_NOT_EXIST:
      return "ID does not exist";
    case rendezvous.PunchHoleResponse_Failure.OFFLINE:
      return "Remote desktop is offline";
    case rendezvous.PunchHoleResponse_Failure.LICENSE_MISMATCH:
      return "Key mismatch";
    case rendezvous.PunchHoleResponse_Failure.LICENSE_OVERUSE:
      return "Key overuse";
    default:
      return "Unknown error (code: " + failure + ")";
  }
}

export async function secureHandshake(
  ws: Websock,
  peerId: string,
  pkIn?: Uint8Array,
): Promise<boolean | undefined> {
  let pk = pkIn;
  const RS_PK = "1+osBpZv1anmzl0VBLmVJXYvwDp3TN3nX+DS9YOcuXc=";
  if (pk) {
    try {
      pk = await verify(pk, getEffectiveOption("key") || RS_PK);
      if (pk) {
        const idpk = message.IdPk.decode(pk);
        if (idpk.id == peerId) {
          pk = idpk.pk;
        }
      }
      if (pk?.length != 32) {
        pk = undefined;
      }
    } catch (e) {
      console.error(e);
      pk = undefined;
    }
    if (!pk)
      console.error(
        "Handshake failed: invalid public key from rendezvous server",
      );
  }
  if (!pk) {
    ws.sendMessage({ public_key: message.PublicKey.fromPartial({}) });
    return;
  }
  const msg = (await ws.next()) as message.Message;
  let signedId: any = msg?.signed_id;
  if (!signedId) {
    console.error("Handshake failed: invalid message type");
    ws.sendMessage({ public_key: message.PublicKey.fromPartial({}) });
    return;
  }
  try {
    signedId = await verify(signedId.id, Uint8Array.from(pk!));
  } catch (e) {
    console.error(e);
    ws.sendMessage({ public_key: message.PublicKey.fromPartial({}) });
    return;
  }
  const idpk = message.IdPk.decode(signedId);
  if (idpk.id != peerId) {
    console.error("Handshake failed: sign failure");
    ws.sendMessage({ public_key: message.PublicKey.fromPartial({}) });
    return;
  }
  const theirPk = idpk.pk;
  if (theirPk.length != 32) {
    console.error("Handshake failed: invalid public box key length from peer");
    ws.sendMessage({ public_key: message.PublicKey.fromPartial({}) });
    return;
  }
  const [mySk, asymmetric_value] = genBoxKeyPair();
  const secret_key = genSecretKey();
  const symmetric_value = seal(secret_key, theirPk, mySk);
  ws.sendMessage({
    public_key: message.PublicKey.fromPartial({
      asymmetric_value,
      symmetric_value,
    }),
  });
  ws.setSecretKey(secret_key);
  return true;
}

export async function connectRelay(
  rr: rendezvous.RelayResponse,
  peerId: string,
  sessionId: string | undefined,
  onReady: (ws: Websock, secure: boolean) => Promise<void>,
): Promise<void> {
  let uri = rr.relay_server;
  const customHost = getEffectiveOption("custom-rendezvous-server");
  if (customHost) {
    uri = getDefaultUri(true);
  } else if (uri) {
    uri = getrUriFromRs(uri, true, 2);
  } else {
    uri = getDefaultUri(true);
  }
  const uuid = rr.uuid;
  const ws = new Websock(uri, false);
  await ws.open();
  ws.sendRendezvous({
    request_relay: rendezvous.RequestRelay.fromPartial({
      licence_key: getEffectiveOption("key") || undefined,
      uuid,
    }),
  });
  const secure = (await secureHandshake(ws, peerId, rr.pk)) || false;
  pushEvent("connection_ready", { secure, direct: false }, sessionId);
  await onReady(ws, secure);
}

export async function startPunchHole(
  id: string,
  connType: rendezvous.ConnType,
  onRelay: (rr: rendezvous.RelayResponse) => Promise<void>,
  onError?: (title: string, text: string) => void,
): Promise<boolean> {
  const reportError = (title: string, text: string) => {
    if (onError) onError(title, text);
    else msgbox("error", title, text);
  };
  const uri = getDefaultUri();
  const ws = new Websock(uri, true);
  await ws.open();
  ws.sendRendezvous({
    punch_hole_request: rendezvous.PunchHoleRequest.fromPartial({
      id,
      licence_key: getEffectiveOption("key") || undefined,
      conn_type: connType,
      nat_type: rendezvous.NatType.SYMMETRIC,
      token: getEffectiveOption("access_token") || undefined,
    }),
  });
  const msg = (await ws.next()) as rendezvous.RendezvousMessage;
  ws.close();
  const phr = msg.punch_hole_response;
  const rr = msg.relay_response;
  if (phr) {
    if (phr?.other_failure) {
      reportError("Error", phr?.other_failure);
      return false;
    }
    if (phr.failure != rendezvous.PunchHoleResponse_Failure.UNRECOGNIZED) {
      reportError("Error", punchHoleFailureMessage(phr.failure));
      return false;
    }
  } else if (rr) {
    if (!rr.version) {
      reportError("Error", "Remote version is low, not support web");
      return false;
    }
    await onRelay(rr);
    return true;
  } else {
    console.error("No punch hole response or relay response in message!");
  }
  return false;
}
