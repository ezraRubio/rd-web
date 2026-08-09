import { getSession, removeSession } from "../connections/sessions";

export function connFor(sessionId) {
  return getSession(sessionId) || window.curConn;
}

export function setConn(conn) {
  window.curConn = conn;
}

export function getConn() {
  return window.curConn;
}

export function close() {
  const conn = getConn();
  if (conn?._sessionId) {
    removeSession(conn._sessionId);
    return;
  }
  conn?.close();
  setConn(undefined);
}
