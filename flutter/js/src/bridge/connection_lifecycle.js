import { connFor } from "./conn_registry";

export { connFor, setConn, getConn, close } from "./conn_registry";

export async function startConn(id, password = undefined, sessionId) {
  setByName("remote_id", id);
  const conn = connFor(sessionId);
  if (conn) await conn.start(id, password);
}
