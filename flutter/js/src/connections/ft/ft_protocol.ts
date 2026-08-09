import * as message from "../../proto/message.js";

export const BLOCK_SIZE = 128 * 1024;

export function fdToJson(
  id: number,
  path: string,
  entries: message.FileEntry[],
): string {
  return JSON.stringify({
    id,
    path,
    entries: entries.map((e) => ({
      entry_type: e.entry_type,
      name: e.name,
      size: Number(e.size),
      modified_time: Number(e.modified_time),
    })),
  });
}

export function makeFileAction(msg: message.FileAction): message.Message {
  return message.Message.fromPartial({ file_action: msg });
}

export function makeFileResponse(msg: message.FileResponse): message.Message {
  return message.Message.fromPartial({ file_response: msg });
}

export function readDirAction(
  path: string,
  includeHidden: boolean,
): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      read_dir: message.ReadDir.fromPartial({
        path,
        include_hidden: includeHidden,
      }),
    }),
  );
}

export function sendAction(
  id: number,
  path: string,
  fileNum: number,
  includeHidden: boolean,
): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      send: message.FileTransferSendRequest.fromPartial({
        id,
        path,
        file_num: fileNum,
        include_hidden: includeHidden,
      }),
    }),
  );
}

export function receiveAction(
  id: number,
  path: string,
  files: message.FileEntry[],
  fileNum: number,
  totalSize: number,
): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      receive: message.FileTransferReceiveRequest.fromPartial({
        id,
        path,
        files,
        file_num: fileNum,
        total_size: totalSize,
      }),
    }),
  );
}

export function digestResponse(
  id: number,
  fileNum: number,
  fileSize: number,
  lastModified: number,
): message.Message {
  return makeFileResponse(
    message.FileResponse.fromPartial({
      digest: message.FileTransferDigest.fromPartial({
        id,
        file_num: fileNum,
        file_size: fileSize,
        last_modified: lastModified,
        is_upload: true,
        is_identical: false,
      }),
    }),
  );
}

export function sendConfirmAction(
  id: number,
  fileNum: number,
  skip: boolean,
  offsetBlk = 0,
): message.Message {
  const union = skip ? { skip: true } : { offset_blk: offsetBlk };
  return makeFileAction(
    message.FileAction.fromPartial({
      send_confirm: message.FileTransferSendConfirmRequest.fromPartial({
        id,
        file_num: fileNum,
        ...union,
      }),
    }),
  );
}

export function cancelAction(id: number): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      cancel: message.FileTransferCancel.fromPartial({ id }),
    }),
  );
}

export function removeFileAction(
  id: number,
  path: string,
  fileNum: number,
): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      remove_file: message.FileRemoveFile.fromPartial({
        id,
        path,
        file_num: fileNum,
      }),
    }),
  );
}

export function createDirAction(id: number, path: string): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      create: message.FileDirCreate.fromPartial({ id, path }),
    }),
  );
}

export function renameAction(
  id: number,
  path: string,
  newName: string,
): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      rename: message.FileRename.fromPartial({ id, path, new_name: newName }),
    }),
  );
}

export function allFilesAction(
  id: number,
  path: string,
  includeHidden: boolean,
): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      all_files: message.ReadAllFiles.fromPartial({
        id,
        path,
        include_hidden: includeHidden,
      }),
    }),
  );
}

export function readEmptyDirsAction(
  path: string,
  includeHidden: boolean,
): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      read_empty_dirs: message.ReadEmptyDirs.fromPartial({
        path,
        include_hidden: includeHidden,
      }),
    }),
  );
}

export function removeDirAction(id: number, path: string): message.Message {
  return makeFileAction(
    message.FileAction.fromPartial({
      remove_dir: message.FileRemoveDir.fromPartial({
        id,
        path,
        recursive: true,
      }),
    }),
  );
}

export function emptyDirsToJson(res: message.ReadEmptyDirsResponse): string {
  const empty_dirs = (res.empty_dirs || []).map((fd) => ({
    id: fd.id,
    path: fd.path,
    entries: (fd.entries || []).map((e) => ({
      entry_type: e.entry_type,
      name: e.name,
      size: Number(e.size),
      modified_time: Number(e.modified_time),
    })),
  }));
  return JSON.stringify({ path: res.path, empty_dirs });
}

export function blockResponse(
  id: number,
  fileNum: number,
  data: Uint8Array,
  compressed: boolean,
  blkId: number,
): message.Message {
  return makeFileResponse(
    message.FileResponse.fromPartial({
      block: message.FileTransferBlock.fromPartial({
        id,
        file_num: fileNum,
        data,
        compressed,
        blk_id: blkId,
      }),
    }),
  );
}

export function doneResponse(id: number, fileNum: number): message.Message {
  return makeFileResponse(
    message.FileResponse.fromPartial({
      done: message.FileTransferDone.fromPartial({ id, file_num: fileNum }),
    }),
  );
}

export function peerInfoEvent(pi: message.PeerInfo): Record<string, string> {
  const features = { privacy_mode: pi.features?.privacy_mode ?? false };
  return {
    username: pi.username || "",
    hostname: pi.hostname || "",
    platform: pi.platform || "",
    sas_enabled: String(!!pi.sas_enabled),
    displays: "[]",
    version: pi.version || "",
    features: JSON.stringify(features),
    current_display: String(pi.current_display || 0),
    resolutions: "[]",
    platform_additions: pi.platform_additions || "",
  };
}
