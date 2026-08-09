import type RdConnection from "./rd_connection";
import * as message from "../proto/message.js";
import { loadVp9 } from "../helpers/codec";
import { draw } from "../helpers/video_draw.js";

export function loadVideoDecoder(conn: RdConnection) {
  const old = conn._videoDecoder;
  loadVp9((decoder: any) => {
    conn._videoDecoder = decoder;
    try {
      old?.close();
    } catch (_) {}
  });
}

export function sendVideoReceived(conn: RdConnection) {
  const misc = message.Misc.fromPartial({ video_received: true });
  conn._ws?.sendMessage({ misc });
}

export function handleVideoFrame(conn: RdConnection, vf: message.VideoFrame) {
  if (!conn._firstFrame) {
    conn.msgbox("", "", "");
    conn._firstFrame = true;
  }
  if (!vf.vp9s) return;

  const dec = conn._videoDecoder;
  if (!dec) {
    console.warn(
      "[handleVideoFrame] VP9 decoder not ready yet, dropping frame",
    );
    return;
  }
  var tm = new Date().getTime();
  var i = 0;
  const n = vf.vp9s?.frames.length;
  vf.vp9s.frames.forEach((f) => {
    try {
      dec.processFrame(f.data.slice(0).buffer, (ok: any) => {
        i++;
        if (i == n) sendVideoReceived(conn);
        if (ok && dec.frameBuffer && n == i) {
          draw(vf.display as number, dec.frameBuffer, conn.sid());
          const now = new Date().getTime();
          var elapsed = now - tm;
          conn._videoTestSpeed[1] += elapsed;
          conn._videoTestSpeed[0] += 1;
          if (conn._videoTestSpeed[0] >= 30) {
            conn._videoTestSpeed = [0, 0];
          }
        }
      });
    } catch (e) {
      i++;
      console.warn(
        "[handleVideoFrame] processFrame failed, dropping frame",
        e,
      );
      if (i == n) sendVideoReceived(conn);
    }
  });
}
