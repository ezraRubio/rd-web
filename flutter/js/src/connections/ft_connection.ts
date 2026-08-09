import * as message from "../proto/message.js";
import * as rendezvous from "../proto/rendezvous.js";
import { msgbox } from "../bridge/errors.js";
import { formatErrorMessage } from "../helpers/format_error";
import {
  BaseConnection,
  SessionKind,
  ensureLoginSessionId,
} from "./session_base";
import {
  fdToJson,
  peerInfoEvent,
  readDirAction,
  sendAction,
  receiveAction,
  digestResponse,
  sendConfirmAction,
  cancelAction,
  removeFileAction,
  createDirAction,
  renameAction,
  allFilesAction,
  readEmptyDirsAction,
  removeDirAction,
  blockResponse,
  doneResponse,
  emptyDirsToJson,
  BLOCK_SIZE,
} from "./ft/ft_protocol";
import { FileJobManager } from "./ft/ft_jobs";
import type { ReadJob } from "./ft/ft_jobs";
import {
  pickFiles,
  notifySelectedFile,
  getPickedFile,
  buildFolderUploadPlan,
  notifySelectedFolder,
  takeFolderPlan,
  pickDownloadSaveTarget,
  remoteDownloadSuggestedName,
  type DownloadSaveTarget,
} from "./ft/ft_browser_io";
import type { WriteJob } from "./ft/ft_jobs";
import { endFileTransferSession } from "./sessions";

type MsgboxCallback = (type: string, title: string, text: string) => void;

const FT_DISCONNECT_FALLBACK = "File transfer session ended";

export default class FtConnection extends BaseConnection {
  readonly kind: SessionKind = "file-transfer";

  _msgbox: MsgboxCallback;
  _peerPlatform = "";
  _peerHostname = "";
  _jobs = new FileJobManager();
  _uploadTick = false;
  _remember = false;
  _closing = false;
  _ftSessionEnded = false;
  _progressInterval: ReturnType<typeof setInterval> | undefined;
  _downloadQueue: {
    id: number;
    path: string;
    to: string;
    fileNum: number;
    includeHidden: boolean;
    isDir: boolean;
  }[] = [];
  _downloadQueueRunning = false;

  constructor() {
    super();
    this._msgbox = msgbox;
  }

  setRemember(v: boolean) {
    this._remember = v;
  }

  getRemember(): boolean {
    return this._remember;
  }

  protected reportConnectError(title: string, text: string) {
    endFileTransferSession(this.sid(), { title, message: text });
  }

  protected onPasswordRequired() {
    this.msgbox("input-password", "Password Required", "");
  }

  protected buildLoginRequest(password?: Uint8Array): message.LoginRequest {
    const showHidden = !!this.getOption("remote_show_hidden");
    return message.LoginRequest.fromPartial({
      username: this._id,
      my_id: "web",
      my_name: "web",
      password,
      session_id: ensureLoginSessionId(this),
      file_transfer: message.FileTransfer.fromPartial({
        dir: "",
        show_hidden: showHidden,
      }),
      video_ack_required: false,
    });
  }

  async start(id?: string, password?: string) {
    if (id) this._id = id;
    if (password) this._plaintextPassword = password;
    try {
      await this._start(this._id);
    } catch (e: any) {
      if (!this._closing && !this._ftSessionEnded) {
        endFileTransferSession(this.sid(), {
          title: "Connection Error",
          message:
            e?.type == "close"
              ? "Reset by the peer"
              : formatErrorMessage(e, FT_DISCONNECT_FALLBACK),
        });
      }
    }
  }

  async _start(id: string) {
    this.prepareConnect(id);
    this._progressInterval = setInterval(() => this.emitJobProgress(), 1000);

    const ok = await this.establishConnection(
      rendezvous.ConnType.FILE_TRANSFER,
    );
    if (!ok && !this._ws && !this._closing && !this._ftSessionEnded) {
      endFileTransferSession(this.sid(), {
        title: "Connection Error",
        message: "Failed to connect file transfer session",
      });
    }
  }

  async msgLoop() {
    let disconnectMessage: string | undefined;
    try {
      while (true) {
        const msg = (await this._ws?.next(0)) as message.Message;
        if (!msg) break;

        if (msg.hash) {
          this._hash = msg.hash;
          this.handleHashMessage();
        } else if (msg.login_response) {
          await this.handleLoginResponse(msg.login_response);
        } else if (msg.file_response) {
          await this.handleFileResponse(msg.file_response);
        } else if (msg.file_action) {
          await this.handleFileAction(msg.file_action);
        } else if (msg.misc?.permission_info) {
          const p = msg.misc.permission_info;
          this.ev("permission", {
            permission: String(p.permission),
            enabled: String(p.enabled),
          });
        }
      }
    } catch (error) {
      if (!this._closing && !this._ftSessionEnded) {
        console.error("File transfer msgLoop error:", error);
        this.failActiveJobs("Connection lost");
        disconnectMessage = formatErrorMessage(error, FT_DISCONNECT_FALLBACK);
      }
    }
    if (!this._closing && !this._ftSessionEnded) {
      endFileTransferSession(this.sid(), {
        title: disconnectMessage ? "Connection Error" : "File transfer",
        message: disconnectMessage ?? "File transfer session ended",
      });
    }
  }

  async handleLoginResponse(r: message.LoginResponse) {
    if (r.error) {
      endFileTransferSession(this.sid(), {
        title: "Login Error",
        message: r.error,
      });
      return;
    }
    if (r.peer_info) {
      this.handlePeerInfo(r.peer_info);
    }
  }

  handlePeerInfo(pi: message.PeerInfo) {
    this._peerInfo = pi;
    this._peerPlatform = pi.platform || "";
    this._peerHostname = pi.hostname || "";
    this.msgbox("success", "Successful", "Connected");
    this.ev("peer_info", peerInfoEvent(pi));
    if (this.getRemember()) {
      this.persistPasswordIfRemembered();
    }
    this.setOption("info", pi);
  }

  async handleFileResponse(fr: message.FileResponse) {
    if (fr.dir) {
      const fd = fr.dir;
      const job = this._jobs.writeJobs.get(fd.id);
      if (job && fd.entries?.length) {
        this._jobs.setDownloadFiles(job, fd.entries);
      }
      this.ev("file_dir", {
        is_local: "false",
        value: fdToJson(fd.id, fd.path, fd.entries || []),
      });
      return;
    }
    if (fr.empty_dirs) {
      this.ev("empty_dirs", {
        is_local: "false",
        value: emptyDirsToJson(fr.empty_dirs),
      });
      return;
    }
    if (fr.digest) {
      await this.handleDigest(fr.digest);
      return;
    }
    if (fr.block) {
      await this.handleBlock(fr.block);
      return;
    }
    if (fr.done) {
      await this.handleDone(fr.done);
      return;
    }
    if (fr.error) {
      this.handleError(fr.error);
    }
  }

  async handleDigest(d: message.FileTransferDigest) {
    const job = this._jobs.writeJobs.get(d.id) || this._jobs.readJobs.get(d.id);
    if (!job) return;

    if (d.is_upload) {
      this.ev("override_file_confirm", {
        id: String(d.id),
        file_num: String(d.file_num),
        read_path: (job as any).remotePath || (job as any).localPath || "",
        is_upload: "true",
        is_identical: String(!!d.is_identical),
      });
    } else {
      this.sendConfirm(d.id, d.file_num, false, 0);
    }
  }

  async handleBlock(block: message.FileTransferBlock) {
    const job = this._jobs.writeJobs.get(block.id);
    if (!job) return;
    try {
      await this._jobs.appendBlock(
        job,
        block.file_num,
        block.data,
        block.compressed,
      );
    } catch (e) {
      console.error("block write failed", e);
      this.pushJobError(block.id, block.file_num, String(e));
    }
  }

  async handleDone(d: message.FileTransferDone) {
    // Host echoes Done after each file; ignore while a multi-file upload job is active.
    if (this._jobs.readJobs.has(d.id)) {
      return;
    }
    const job = this._jobs.writeJobs.get(d.id);
    if (job) {
      try {
        await this._jobs.finalizeDownload(job);
      } catch (e) {
        this.pushJobError(d.id, d.file_num, String(e));
        this._jobs.removeJob(d.id);
        return;
      }
      this._jobs.removeJob(d.id);
      const fileNum =
        job.isFolderDownload && job.files.length > 0
          ? job.files.length - 1
          : d.file_num;
      this.ev("job_done", {
        id: String(d.id),
        file_num: String(fileNum),
      });
      return;
    }
    this.ev("job_done", {
      id: String(d.id),
      file_num: String(d.file_num),
    });
  }

  handleError(e: message.FileTransferError) {
    this._jobs.removeJob(e.id);
    this.pushJobError(e.id, e.file_num, e.error);
  }

  pushJobError(id: number, fileNum: number, err: string) {
    this.ev("job_error", {
      id: String(id),
      file_num: String(fileNum),
      err,
    });
  }

  async handleFileAction(fa: message.FileAction) {
    if (fa.send_confirm) {
      const c = fa.send_confirm;
      const job = this._jobs.readJobs.get(c.id);
      if (!job) return;
      if (c.skip) {
        this.advanceUploadAfterFile(c.id, job, c.file_num, true);
        return;
      }
      const offsetBlk = c.offset_blk ?? 0;
      if (offsetBlk > 0) {
        job.offset = offsetBlk * BLOCK_SIZE;
        job.finishedSize = job.offset;
        job.blkId = offsetBlk;
      }
      job.active = true;
      job.waitingConfirm = false;
      await this.pumpUploadBlocks(c.id);
    }
  }

  failActiveJobs(err: string) {
    for (const job of this._jobs.readJobs.values()) {
      this.pushJobError(job.id, job.fileNum, err);
    }
    for (const job of this._jobs.writeJobs.values()) {
      this.pushJobError(job.id, job.fileNum, err);
    }
    this._jobs.readJobs.clear();
    this._jobs.writeJobs.clear();
    this._jobs.pendingUploads.clear();
  }

  async pumpUploadBlocks(id: number) {
    if (this._uploadTick) return;
    this._uploadTick = true;
    try {
      while (true) {
        const job = this._jobs.readJobs.get(id);
        if (!job || !job.active) break;
        const next = await this._jobs.nextUploadBlock(job);
        if (!next) break;
        if (next.data.length > 0) {
          this.queueMessage(
            blockResponse(id, job.fileNum, next.data, false, job.blkId),
          );
        }
        if (next.finished) {
          const hasMore = job.fileNum + 1 < job.files.length;
          if (hasMore) {
            // Match native client: advance to next file without Done (host keeps one write job).
            this.advanceUploadAfterFile(id, job, job.fileNum, false);
          } else {
            this.queueMessage(doneResponse(id, job.fileNum));
            this._jobs.removeJob(id);
            this.ev("job_done", {
              id: String(id),
              file_num: String(job.fileNum),
            });
          }
          break;
        }
        await new Promise((r) => setTimeout(r, 1));
      }
    } finally {
      this._uploadTick = false;
    }
  }

  emitJobProgress() {
    for (const job of this._jobs.writeJobs.values()) {
      this.ev("job_progress", this._jobs.progressPayload(job));
    }
    for (const job of this._jobs.readJobs.values()) {
      if (job.active || job.finishedSize > 0) {
        this.ev("job_progress", this._jobs.progressPayload(job));
      }
    }
  }

  readRemoteDir(path: string, includeHidden: boolean) {
    this.queueMessage(readDirAction(path, includeHidden));
  }

  queueDigestForCurrentFile(job: ReadJob) {
    const file = job.file ?? job.uploadFiles[job.fileNum];
    if (!file) return;
    this.queueMessage(
      digestResponse(
        job.id,
        job.fileNum,
        file.size,
        Math.floor(file.lastModified / 1000),
      ),
    );
  }

  advanceUploadAfterFile(
    id: number,
    job: ReadJob,
    finishedFileNum: number,
    _skipped = false,
  ) {
    const finishedFile = job.uploadFiles[finishedFileNum];
    if (finishedFile) {
      job.finishedBase += finishedFile.size;
    }
    const nextFileNum = finishedFileNum + 1;
    if (nextFileNum < job.files.length) {
      job.fileNum = nextFileNum;
      job.file = job.uploadFiles[nextFileNum];
      job.offset = 0;
      job.blkId = 0;
      job.finishedSize = job.finishedBase;
      job.active = false;
      job.waitingConfirm = true;
      this.queueDigestForCurrentFile(job);
      return;
    }
    this._jobs.removeJob(id);
    this.ev("job_done", {
      id: String(id),
      file_num: String(finishedFileNum),
    });
  }

  sendFiles(
    id: number,
    path: string,
    to: string,
    fileNum: number,
    includeHidden: boolean,
    isRemote: boolean,
    isDir: boolean,
  ) {
    if (isRemote) {
      this._downloadQueue.push({
        id,
        path,
        to,
        fileNum,
        includeHidden,
        isDir,
      });
      void this.processDownloadQueue();
      return;
    }
    const file = this._jobs.pendingUploads.get(id);
    if (!file) {
      this.pushJobError(id, fileNum, "No local file selected");
      return;
    }
    const job = this._jobs.createUploadJob(
      id,
      path,
      to,
      fileNum,
      file,
      includeHidden,
    );
    this.queueMessage(receiveAction(id, to, job.files, fileNum, job.totalSize));
    this.queueMessage(
      digestResponse(
        id,
        fileNum,
        file.size,
        Math.floor(file.lastModified / 1000),
      ),
    );
  }

  private async processDownloadQueue() {
    if (this._downloadQueueRunning) return;
    this._downloadQueueRunning = true;
    try {
      while (this._downloadQueue.length) {
        const item = this._downloadQueue.shift()!;
        await this.startRemoteDownload(item);
      }
    } finally {
      this._downloadQueueRunning = false;
    }
  }

  private async ensureDownloadSaveTarget(
    job: Pick<WriteJob, "saveTarget" | "fileName" | "isFolderDownload">,
  ): Promise<boolean> {
    if (job.saveTarget) return true;
    const suggestedName = remoteDownloadSuggestedName(
      job.fileName,
      job.isFolderDownload,
    );
    const pick = await pickDownloadSaveTarget(suggestedName);
    if (pick === null) return false;
    if (pick !== "unsupported") {
      (job as { saveTarget?: DownloadSaveTarget }).saveTarget = pick;
    }
    return true;
  }

  private async startRemoteDownload(item: {
    id: number;
    path: string;
    to: string;
    fileNum: number;
    includeHidden: boolean;
    isDir: boolean;
  }) {
    const { id, path, fileNum, includeHidden, isDir } = item;
    const job = this._jobs.createDownloadJob(id, path, item.to, fileNum, isDir);
    if (!(await this.ensureDownloadSaveTarget(job))) {
      this._jobs.removeJob(id);
      this.pushJobError(id, fileNum, "Download cancelled");
      return;
    }
    this.sendMessage(sendAction(id, path, fileNum, includeHidden));
  }

  addJob(
    id: number,
    path: string,
    to: string,
    fileNum: number,
    includeHidden: boolean,
    isRemote: boolean,
  ) {
    if (isRemote) {
      this._jobs.createDownloadJob(id, path, to, fileNum);
    } else {
      const file = this._jobs.pendingUploads.get(id);
      if (file) {
        this._jobs.createUploadJob(id, path, to, fileNum, file, includeHidden);
      }
    }
  }

  resumeJob(id: number, isRemote: boolean) {
    if (isRemote) {
      void this.resumeRemoteDownload(id);
    } else {
      const job = this._jobs.readJobs.get(id);
      if (job?.file) {
        job.active = true;
        this.pumpUploadBlocks(id);
      }
    }
  }

  private async resumeRemoteDownload(id: number) {
    const job = this._jobs.writeJobs.get(id);
    if (!job) return;
    if (!(await this.ensureDownloadSaveTarget(job))) {
      this.pushJobError(id, job.fileNum, "Download cancelled");
      return;
    }
    this.sendMessage(sendAction(id, job.remotePath, job.fileNum, false));
  }

  sendConfirm(id: number, fileNum: number, skip: boolean, offsetBlk = 0) {
    this.sendMessage(sendConfirmAction(id, fileNum, skip, offsetBlk));
    const job = this._jobs.readJobs.get(id);
    if (job && !skip) {
      job.active = true;
    }
  }

  confirmOverrideFile(
    id: number,
    fileNum: number,
    needOverride: boolean,
    _remember: boolean,
    isUpload: boolean,
  ) {
    if (isUpload) {
      this.sendConfirm(id, fileNum, !needOverride, 0);
      if (needOverride) {
        const job = this._jobs.readJobs.get(id);
        if (job) job.active = true;
      }
    } else {
      this.sendConfirm(id, fileNum, !needOverride, 0);
    }
  }

  cancelJob(id: number) {
    this._jobs.removeJob(id);
    this.sendMessage(cancelAction(id));
  }

  removeFile(id: number, path: string, fileNum: number, isRemote: boolean) {
    if (isRemote) {
      this.sendMessage(removeFileAction(id, path, fileNum));
    } else {
      this.ev("job_done", { id: String(id), file_num: String(fileNum) });
    }
  }

  createDir(id: number, path: string, isRemote: boolean) {
    if (isRemote) {
      this.sendMessage(createDirAction(id, path));
    } else {
      this.ev("job_done", { id: String(id), file_num: "-1" });
    }
  }

  renameFile(id: number, path: string, newName: string, isRemote: boolean) {
    if (isRemote) {
      this.sendMessage(renameAction(id, path, newName));
    } else {
      this.ev("job_done", { id: String(id), file_num: "-1" });
    }
  }

  readDirToRemoveRecursive(
    id: number,
    path: string,
    isRemote: boolean,
    showHidden: boolean,
  ) {
    if (isRemote) {
      this.sendMessage(allFilesAction(id, path, showHidden));
    }
  }

  removeAllEmptyDirs(id: number, path: string, isRemote: boolean) {
    if (isRemote) {
      this.sendMessage(removeDirAction(id, path));
    }
  }

  readEmptyDirs(path: string, includeHidden: boolean) {
    this.sendMessage(readEmptyDirsAction(path, includeHidden));
  }

  async selectFiles(isFolder = false) {
    const files = await pickFiles(isFolder);
    if (!files.length) return;
    if (isFolder) {
      const includeHidden = !!this.getOption("remote_show_hidden");
      const plan = buildFolderUploadPlan(files, includeHidden);
      if (!plan) {
        this.msgbox("error", "Error", "No files found in selected folder");
        return;
      }
      notifySelectedFolder(plan, this.sid());
      return;
    }
    files.forEach((file, i) => notifySelectedFile(i, file, this.sid()));
  }

  sendFolderUpload(id: number, to: string, includeHidden: boolean) {
    const plan = takeFolderPlan();
    if (!plan) {
      this.pushJobError(id, 0, "No folder selected");
      return;
    }
    const entries = plan.files.map((file, i) =>
      message.FileEntry.fromPartial({
        name: plan.relativeNames[i],
        size: file.size,
        modified_time: Math.floor(file.lastModified / 1000),
        entry_type: 4,
      }),
    );
    const job = this._jobs.createMultiFileUploadJob(
      id,
      plan.folderName,
      to,
      0,
      plan.files,
      entries,
      plan.totalSize,
      includeHidden,
    );
    this.queueMessage(receiveAction(id, to, job.files, 0, job.totalSize));
    this.queueDigestForCurrentFile(job);
  }

  sendLocalFiles(
    id: number,
    handleIndex: number,
    path: string,
    to: string,
    fileNum: number,
    includeHidden: boolean,
    isRemote: boolean,
  ) {
    const file = getPickedFile(handleIndex);
    if (!file) {
      this.pushJobError(id, fileNum, "Local file not found");
      return;
    }
    this._jobs.pendingUploads.set(id, file);
    this.sendFiles(id, path, to, fileNum, includeHidden, isRemote, false);
  }

  getPlatform(): string {
    return this._peerPlatform;
  }

  msgbox(type_: string, title: string, text: string) {
    if (!type_ || type_ === "connecting" || type_ === "success") {
      this._msgbox?.(type_, title, text);
      return;
    }
    endFileTransferSession(this.sid(), {
      title: title || "File transfer",
      message: text || title || "File transfer session ended",
    });
  }

  cancelAllJobs() {
    const ids = new Set<number>();
    for (const id of this._jobs.readJobs.keys()) ids.add(id);
    for (const id of this._jobs.writeJobs.keys()) ids.add(id);
    const wsOpen = this._ws && (this._ws as any)._status === "open";
    for (const id of ids) {
      if (wsOpen) {
        this.sendMessage(cancelAction(id));
      }
    }
    this._jobs.writeJobs.clear();
    this._jobs.readJobs.clear();
    this._jobs.pendingUploads.clear();
  }

  close() {
    if (this._closing) return;
    this._closing = true;
    if (this._progressInterval) clearInterval(this._progressInterval);
    this.cancelAllJobs();
    this.baseClose();
  }
}
