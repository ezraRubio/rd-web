import {
  connTokenFor,
  requireRemoteDesktop,
  requireFileTransfer,
} from "../../connections/sessions";
import { connFor } from "../conn_registry";

export function bridgeContext(sessionId) {
  return {
    sessionId,
    rd: () => requireRemoteDesktop(sessionId),
    ft: () => requireFileTransfer(sessionId),
    curConn: connFor(sessionId),
    connToken: () => (sessionId ? connTokenFor(sessionId) || "" : ""),
  };
}
