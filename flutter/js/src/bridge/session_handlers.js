import RdConnection from "../connections/rd_connection";
import FtConnection from "../connections/ft_connection";
import {
  addSession,
  getSession,
  removeSession,
  applyConnToken,
} from "../connections/sessions";
import { startConn, close } from "./connection_lifecycle";
import { msgbox } from "./errors";

export function sessionAdd(value) {
  try {
    const data = JSON.parse(value);
    const sessionId = data.session_id;
    if (!sessionId) return "missing session_id";
    const conn = data.isFileTransfer
      ? new FtConnection()
      : new RdConnection();
    addSession(sessionId, conn);
    if (data.conn_token) {
      applyConnToken(conn, data.conn_token);
    } else if (data.password) {
      conn.setPlaintextPassword(data.password);
    }
    return "";
  } catch (e) {
    return e.message;
  }
}

export function sessionStart(value) {
  try {
    const data = JSON.parse(value);
    const sessionId = data.session_id;
    const conn = getSession(sessionId);
    if (!conn) {
      return;
    }
    window.curConn = conn;
    if (data["id"]) {
      startConn(data["id"], data["password"] || undefined, sessionId);
    } else {
      msgbox("error", "Error", "No id found in session data " + value, "");
    }
  } catch (e) {
    msgbox("error", "Error", e.message, "");
  }
}

export function sessionClose(value) {
  const sessionId = value;
  if (sessionId) {
    removeSession(sessionId);
  } else {
    close();
  }
}
