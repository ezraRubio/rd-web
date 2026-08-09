import { zipSync } from "fflate";
import type * as message from "../../proto/message.js";
import { concatChunks } from "../../helpers/binary";
import { zipEntryPath } from "./ft_zip_stream";

/** Build a zip blob from in-memory per-file chunks (no pre-selected save path). */
export function buildFolderZipFromChunks(
  rootName: string,
  files: message.FileEntry[],
  chunksForFileNum: (fileNum: number) => Uint8Array[],
): Uint8Array {
  const root = rootName || "download";
  const zipEntries: Record<string, Uint8Array> = {};

  for (let i = 0; i < files.length; i++) {
    const relName = files[i].name;
    if (!relName) continue;
    zipEntries[zipEntryPath(root, relName)] = concatChunks(chunksForFileNum(i));
  }

  return zipSync(zipEntries, { level: 0 });
}

export function folderDownloadFilename(fileName: string): string {
  const base = fileName || "download";
  return `${base}.zip`;
}
