import * as message from "../../proto/message.js";
import { BLOCK_SIZE } from "./ft_protocol";
import { decompress } from "../../helpers/common";
import {
  readFileChunk,
  saveDownload,
  writeDownloadChunk,
  closeDownloadTarget,
  type DownloadSaveTarget,
} from "./ft_browser_io";
import {
  buildFolderZipFromChunks,
  folderDownloadFilename,
} from "./ft_folder_zip";
import { FolderZipStreamer } from "./ft_zip_stream";
import { concatChunks } from "../../helpers/binary";

export type WriteJob = {
  id: number;
  remotePath: string;
  localPath: string;
  fileNum: number;
  fileName: string;
  /** Single-file download chunks (legacy path). */
  chunks: Uint8Array[];
  /** Per-file chunks for folder downloads keyed by file_num. */
  fileChunks: Map<number, Uint8Array[]>;
  files: message.FileEntry[];
  isFolderDownload: boolean;
  finishedSize: number;
  totalSize: number;
  lastTick: number;
  speed: number;
  waitingConfirm: boolean;
  skipConfirm: boolean;
  /** Save path chosen before transfer (File System Access API). */
  saveTarget?: DownloadSaveTarget;
  /** Blocks are written directly to saveTarget (single-file downloads). */
  streamingToDisk?: boolean;
  /** Streaming zip writer for folder downloads with a pre-selected save path. */
  folderZipStream?: FolderZipStreamer;
};

export type ReadJob = {
  id: number;
  remotePath: string;
  localPath: string;
  fileNum: number;
  file?: File;
  uploadFiles: File[];
  files: message.FileEntry[];
  offset: number;
  finishedSize: number;
  finishedBase: number;
  totalSize: number;
  includeHidden: boolean;
  blkId: number;
  lastTick: number;
  speed: number;
  active: boolean;
  waitingConfirm: boolean;
};

export class FileJobManager {
  writeJobs = new Map<number, WriteJob>();
  readJobs = new Map<number, ReadJob>();
  pendingUploads = new Map<number, File>();

  createDownloadJob(
    id: number,
    remotePath: string,
    localPath: string,
    fileNum: number,
    isFolderDownload = false,
  ): WriteJob {
    const fileName = remotePath.split(/[/\\]/).pop() || "download";
    const job: WriteJob = {
      id,
      remotePath,
      localPath,
      fileNum,
      fileName,
      chunks: [],
      fileChunks: new Map(),
      files: [],
      isFolderDownload,
      finishedSize: 0,
      totalSize: 0,
      lastTick: Date.now(),
      speed: 0,
      waitingConfirm: false,
      skipConfirm: false,
    };
    this.writeJobs.set(id, job);
    return job;
  }

  setDownloadFiles(job: WriteJob, entries: message.FileEntry[]) {
    job.files = entries;
    job.totalSize = entries.reduce((sum, e) => sum + Number(e.size || 0), 0);
    // isFolderDownload is set at job creation from isDir. The server also sends a
    // dir listing for single-file downloads (one entry with an empty name) — do
    // not treat that as a folder download.
  }

  createUploadJob(
    id: number,
    localPath: string,
    remotePath: string,
    fileNum: number,
    file: File,
    includeHidden: boolean,
  ): ReadJob {
    return this.createMultiFileUploadJob(
      id,
      localPath,
      remotePath,
      fileNum,
      [file],
      [
        message.FileEntry.fromPartial({
          // remotePath already includes the destination filename (see Flutter
          // PathUtil.join); empty name matches native get_recursive_files().
          name: "",
          size: file.size,
          modified_time: Math.floor(file.lastModified / 1000),
          entry_type: 4,
        }),
      ],
      file.size,
      includeHidden,
    );
  }

  createMultiFileUploadJob(
    id: number,
    localPath: string,
    remotePath: string,
    fileNum: number,
    uploadFiles: File[],
    entries: message.FileEntry[],
    totalSize: number,
    includeHidden: boolean,
  ): ReadJob {
    const job: ReadJob = {
      id,
      remotePath,
      localPath,
      fileNum,
      file: uploadFiles[fileNum] ?? uploadFiles[0],
      uploadFiles,
      files: entries,
      offset: 0,
      finishedSize: 0,
      finishedBase: 0,
      totalSize,
      includeHidden,
      blkId: 0,
      lastTick: Date.now(),
      speed: 0,
      active: false,
      waitingConfirm: false,
    };
    this.readJobs.set(id, job);
    if (uploadFiles.length === 1) {
      this.pendingUploads.set(id, uploadFiles[0]);
    }
    return job;
  }

  removeJob(id: number) {
    this.writeJobs.delete(id);
    this.readJobs.delete(id);
    this.pendingUploads.delete(id);
  }

  progressPayload(job: WriteJob | ReadJob) {
    return {
      id: String(job.id),
      file_num: String(job.fileNum),
      speed: String(job.speed),
      finished_size: String(job.finishedSize),
    };
  }

  updateSpeed(job: WriteJob | ReadJob, delta: number) {
    const now = Date.now();
    const elapsed = (now - job.lastTick) / 1000;
    if (elapsed > 0) {
      job.speed = delta / elapsed;
    }
    job.lastTick = now;
  }

  private streamsToDisk(job: WriteJob): boolean {
    return !!job.saveTarget && !job.isFolderDownload;
  }

  private streamsFolderZip(job: WriteJob): boolean {
    return !!job.saveTarget && job.isFolderDownload;
  }

  async appendBlock(
    job: WriteJob,
    fileNum: number,
    data: Uint8Array,
    compressed: boolean,
  ): Promise<void> {
    let bytes = data;
    if (compressed) {
      const d = await decompress(data);
      if (!d) throw new Error("decompress failed");
      bytes = d;
    }
    if (this.streamsToDisk(job)) {
      await writeDownloadChunk(job.saveTarget!, bytes);
      job.streamingToDisk = true;
      job.fileNum = fileNum;
      this.updateSpeed(job, bytes.length);
      job.finishedSize += bytes.length;
      return;
    }
    if (this.streamsFolderZip(job)) {
      if (!job.folderZipStream) {
        job.folderZipStream = new FolderZipStreamer(
          job.saveTarget!,
          job.fileName || "download",
        );
      }
      await job.folderZipStream.appendBlock(fileNum, bytes, job.files);
      job.fileNum = fileNum;
      this.updateSpeed(job, bytes.length);
      job.finishedSize += bytes.length;
      return;
    }
    if (job.isFolderDownload || job.files.length > 0) {
      let chunks = job.fileChunks.get(fileNum);
      if (!chunks) {
        chunks = [];
        job.fileChunks.set(fileNum, chunks);
      }
      chunks.push(bytes);
    } else {
      job.chunks.push(bytes);
    }
    job.fileNum = fileNum;
    this.updateSpeed(job, bytes.length);
    job.finishedSize += bytes.length;
  }

  private chunksForFile(job: WriteJob, fileNum: number): Uint8Array[] {
    return job.fileChunks.get(fileNum) ?? [];
  }

  async finalizeDownload(job: WriteJob): Promise<void> {
    if (job.isFolderDownload && job.files.length > 0) {
      await this.finalizeFolderDownloadAsZip(job);
      return;
    }
    if (job.streamingToDisk && job.saveTarget) {
      await closeDownloadTarget(job.saveTarget);
      return;
    }
    const chunks =
      job.fileChunks.size > 0
        ? this.chunksForFile(job, job.fileNum)
        : job.chunks;
    const out = concatChunks(chunks);
    const name = job.fileName || "download";
    const result = await saveDownload(name, out, job.saveTarget);
    if (result === "cancelled") {
      throw new Error("Download cancelled");
    }
  }

  private async finalizeFolderDownloadAsZip(job: WriteJob): Promise<void> {
    if (job.folderZipStream) {
      await job.folderZipStream.finish();
      return;
    }
    const zipped = buildFolderZipFromChunks(
      job.fileName,
      job.files,
      (i) => this.chunksForFile(job, i),
    );
    const result = await saveDownload(
      folderDownloadFilename(job.fileName),
      zipped,
      job.saveTarget,
    );
    if (result === "cancelled") {
      throw new Error("Download cancelled");
    }
  }

  async nextUploadBlock(job: ReadJob): Promise<{
    data: Uint8Array;
    finished: boolean;
  } | null> {
    const file = job.file ?? job.uploadFiles[job.fileNum];
    if (!file) return null;
    if (job.offset >= file.size) {
      return { data: new Uint8Array(0), finished: true };
    }
    const data = await readFileChunk(
      file,
      job.offset,
      Math.min(BLOCK_SIZE, file.size - job.offset),
    );
    job.offset += data.length;
    job.finishedSize = job.finishedBase + job.offset;
    this.updateSpeed(job, data.length);
    job.blkId += 1;
    if (job.offset >= file.size) {
      return { data, finished: true };
    }
    return { data, finished: false };
  }
}
