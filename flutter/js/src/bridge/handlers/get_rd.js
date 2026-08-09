import { allSessionIds, getSession } from "../../connections/sessions";

export const getRdHandlers = {
  image_quality(ctx) {
    return ctx.rd()?.getImageQuality?.() ?? "";
  },
  "option:toggle"(ctx, arg) {
    return ctx.rd()?.getToggleOption?.(arg) ?? false;
  },
  get_conn_status() {
    let statusNum = 0;
    let videoConnCount = 0;
    for (const sid of allSessionIds()) {
      const conn = getSession(sid);
      if (!conn?.getStatus) continue;
      try {
        const s = JSON.parse(conn.getStatus());
        if ((s.status_num ?? 0) > statusNum) {
          statusNum = s.status_num;
          videoConnCount = s.video_conn_count ?? 0;
        }
      } catch (_) {}
    }
    return JSON.stringify({
      status_num: statusNum,
      video_conn_count: videoConnCount,
    });
  },
};
