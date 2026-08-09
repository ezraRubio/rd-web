import { withFt } from "./helpers.js";

export const setFtHandlers = {
  read_remote_dir(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.readRemoteDir(data.path, data.include_hidden),
    value);
  },
  send_files(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.sendFiles(
        data.id,
        data.path,
        data.to,
        data.file_num,
        data.include_hidden,
        data.is_remote,
        data.is_dir,
      ),
    value);
  },
  confirm_override_file(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.confirmOverrideFile(
        data.id,
        data.file_num,
        data.need_override,
        data.remember,
        data.is_upload,
      ),
    value);
  },
  remove_file(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.removeFile(data.id, data.path, data.file_num, data.is_remote),
    value);
  },
  read_dir_to_remove_recursive(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.readDirToRemoveRecursive(
        data.id,
        data.path,
        data.is_remote,
        data.show_hidden,
      ),
    value);
  },
  remove_all_empty_dirs(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.removeAllEmptyDirs(data.id, data.path, data.is_remote),
    value);
  },
  cancel_job(ctx, value) {
    ctx.ft()?.cancelJob?.(parseInt(value));
  },
  create_dir(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.createDir(data.id, data.path, data.is_remote),
    value);
  },
  rename_file(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.renameFile(data.id, data.path, data.new_name, data.is_remote),
    value);
  },
  select_files(ctx, value) {
    ctx.ft()?.selectFiles?.(value === "true" || value === true);
  },
  send_local_files(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.sendLocalFiles(
        data.id,
        data.handle_index,
        data.path,
        data.to,
        data.file_num,
        data.include_hidden,
        data.is_remote,
      ),
    value);
  },
  send_folder_upload(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.sendFolderUpload(data.id, data.to, data.include_hidden),
    value);
  },
  add_job(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.addJob(
        data.id,
        data.path,
        data.to,
        data.file_num,
        data.include_hidden,
        data.is_remote,
      ),
    value);
  },
  resume_job(ctx, value) {
    withFt(ctx, (conn, data) => conn.resumeJob(data.id, data.is_remote), value);
  },
  read_remote_empty_dirs(ctx, value) {
    withFt(ctx, (conn, data) =>
      conn.readEmptyDirs(data.path, data.include_hidden),
    value);
  },
};
