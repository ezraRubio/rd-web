/**
 * Multi-session registry for concurrent remote desktop and file transfer connections.
 *
 * Lifecycle:
 * 1. Flutter calls session_add_sync → addSession(sessionId, conn)
 * 2. session_start → conn.start(peerId, password?)
 * 3. Bridge setByName/getByName pass sessionId for typed dispatch
 * 4. session_close or endFileTransferSession → removeSession
 *
 * Remote desktop: RdConnection (kind "remote-desktop")
 * File transfer: FtConnection (kind "file-transfer")
 */
import type RdConnection from "./rd_connection";
import type FtConnection from "./ft_connection";
import { BaseConnection } from "./session_base";
import { pushEvent } from "../helpers/push_event.js";

export type SessionConn = BaseConnection;

/** Flutter handleMsgBox closes the file-manager route on this type. */
export const FT_SESSION_ENDED = "ft-session-ended";

const sessions = new Map<string, SessionConn>();

function advanceCurConn(closedConn: SessionConn | undefined): void {
  if (window.curConn !== closedConn) return;
  const remaining = sessions.values().next();
  window.curConn = remaining.done ? undefined : remaining.value;
}

function isFtSessionEnded(conn: SessionConn): boolean {
  return !!(conn as FtConnection & { _ftSessionEnded?: boolean })
    ._ftSessionEnded;
}

export function isRemoteDesktop(
  conn: SessionConn | undefined,
): conn is RdConnection {
  return conn?.kind === "remote-desktop";
}

export function isFileTransfer(
  conn: SessionConn | undefined,
): conn is FtConnection {
  return conn?.kind === "file-transfer";
}

export function requireRemoteDesktop(
  sessionId?: string,
): RdConnection | undefined {
  const conn = getSession(sessionId);
  return isRemoteDesktop(conn) ? conn : undefined;
}

export function requireFileTransfer(
  sessionId?: string,
): FtConnection | undefined {
  const conn = getSession(sessionId);
  return isFileTransfer(conn) ? conn : undefined;
}

export function addSession(sessionId: string, conn: SessionConn): void {
  conn._sessionId = sessionId;
  sessions.set(sessionId, conn);
  window.curConn = conn;
}

export function getSession(sessionId?: string): SessionConn | undefined {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  return window.curConn;
}

export function removeSession(sessionId: string): void {
  const conn = sessions.get(sessionId);
  if (conn) {
    conn.close();
    sessions.delete(sessionId);
  }
  advanceCurConn(conn);
}

export function hasOpenRemoteDesktopSession(): boolean {
  for (const conn of sessions.values()) {
    if (!isRemoteDesktop(conn)) continue;
    const ws = conn._ws;
    if (ws && (ws as { _status?: string })._status === "open") return true;
  }
  return false;
}

export function endFileTransferSession(
  sessionId: string | undefined,
  opts?: { title?: string; message?: string },
): void {
  if (!sessionId) return;
  const conn = sessions.get(sessionId);
  if (!conn || !isFileTransfer(conn)) return;
  if (isFtSessionEnded(conn)) return;
  (
    conn as FtConnection & { _ftSessionEnded?: boolean }
  )._ftSessionEnded = true;

  conn.failActiveJobs("Connection lost");
  conn.close();
  sessions.delete(sessionId);
  advanceCurConn(conn);

  const title = opts?.title ?? "File transfer";
  const message = opts?.message ?? "File transfer session ended";
  pushEvent(
    "msgbox",
    {
      type: FT_SESSION_ENDED,
      title,
      text: message,
      link: "",
      hasRetry: "",
    },
    sessionId,
  );
}

export function allSessionIds(): string[] {
  return Array.from(sessions.keys());
}

export function connTokenFor(sessionId: string): string | null {
  const conn = sessions.get(sessionId);
  if (!conn?._password?.length) return null;
  return JSON.stringify({
    password: Array.from(conn._password as Uint8Array),
    password_source:
      (conn as { _passwordSource?: string })._passwordSource || "",
    session_id: conn._loginSessionId || 0,
  });
}

export function applyConnToken(conn: SessionConn, tokenJson?: string): void {
  if (!tokenJson) return;
  try {
    const token = JSON.parse(tokenJson);
    if (Array.isArray(token.password)) {
      conn._password = Uint8Array.from(token.password);
    }
    if (token.password_source) {
      (conn as { _passwordSource?: string })._passwordSource =
        token.password_source;
    }
    if (token.session_id) {
      conn._loginSessionId = token.session_id;
    }
  } catch (e) {
    console.error("Failed to parse conn_token", e);
  }
}

declare global {
  interface Window {
    curConn: SessionConn | undefined;
  }
}
