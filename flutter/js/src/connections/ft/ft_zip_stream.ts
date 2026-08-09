import { Zip, ZipPassThrough } from "fflate";
import type * as message from "../../proto/message.js";
import {
  closeDownloadTarget,
  writeDownloadChunk,
  type DownloadSaveTarget,
} from "./ft_browser_io";

export function zipEntryPath(rootName: string, relName: string): string {
  const rel = relName.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel) return rootName;
  return `${rootName}/${rel}`;
}

/** Incrementally build a zip on disk while folder download blocks arrive. */
export class FolderZipStreamer {
  private zip = new Zip();
  private writeChain: Promise<void> = Promise.resolve();
  private currentEntry?: ZipPassThrough;
  private currentFileNum?: number;
  private settled = false;
  private finished: Promise<void>;
  private resolveFinish!: () => void;
  private rejectFinish!: (err: unknown) => void;

  constructor(
    private target: DownloadSaveTarget,
    private root: string,
  ) {
    this.finished = new Promise((resolve, reject) => {
      this.resolveFinish = resolve;
      this.rejectFinish = reject;
    });
    this.zip.ondata = (err, chunk, final) => {
      if (this.settled) return;
      if (err) {
        this.settled = true;
        this.rejectFinish(err);
        return;
      }
      this.writeChain = this.writeChain
        .then(() => writeDownloadChunk(this.target, chunk))
        .then(async () => {
          if (final) {
            this.settled = true;
            await closeDownloadTarget(this.target);
            this.resolveFinish();
          }
        })
        .catch((e) => {
          if (!this.settled) {
            this.settled = true;
            this.rejectFinish(e);
          }
        });
    };
  }

  async appendBlock(
    fileNum: number,
    bytes: Uint8Array,
    files: message.FileEntry[],
  ): Promise<void> {
    if (this.currentFileNum !== fileNum) {
      await this.finishCurrentEntry();
      this.startEntry(fileNum, files);
    }
    this.currentEntry!.push(bytes);
  }

  private startEntry(fileNum: number, files: message.FileEntry[]) {
    const entry = files[fileNum];
    const relName = entry?.name;
    if (!relName) {
      throw new Error(`Missing folder entry for file_num ${fileNum}`);
    }
    const zipPath = zipEntryPath(this.root, relName);
    const zipEntry = new ZipPassThrough(zipPath);
    this.zip.add(zipEntry);
    this.currentEntry = zipEntry;
    this.currentFileNum = fileNum;
  }

  private async finishCurrentEntry() {
    if (!this.currentEntry) return;
    this.currentEntry.push(new Uint8Array(0), true);
    this.currentEntry = undefined;
    this.currentFileNum = undefined;
    await this.writeChain;
  }

  async finish(): Promise<void> {
    await this.finishCurrentEntry();
    this.zip.end();
    await this.finished;
    await this.writeChain;
  }
}
