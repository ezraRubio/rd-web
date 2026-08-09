import { pushEvent } from "../../helpers/push_event.js";

let fileInput: HTMLInputElement | undefined;
let lastPickedFiles: File[] = [];

export type FolderUploadPlan = {
  folderName: string;
  files: File[];
  relativeNames: string[];
  totalSize: number;
};

let lastFolderPlan: FolderUploadPlan | undefined;

export function pickFiles(isFolder = false): Promise<File[]> {
  return new Promise((resolve) => {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);
    }
    fileInput.multiple = true;
    if (isFolder) {
      fileInput.setAttribute("webkitdirectory", "");
      fileInput.setAttribute("directory", "");
    } else {
      fileInput.removeAttribute("webkitdirectory");
      fileInput.removeAttribute("directory");
    }
    fileInput.onchange = () => {
      const files = Array.from(fileInput!.files || []);
      lastPickedFiles = files;
      fileInput!.value = "";
      resolve(files);
    };
    fileInput.click();
  });
}

export function getPickedFile(index: number): File | undefined {
  return lastPickedFiles[index];
}

export function takeFolderPlan(): FolderUploadPlan | undefined {
  const plan = lastFolderPlan;
  lastFolderPlan = undefined;
  return plan;
}

export function buildFolderUploadPlan(
  files: File[],
  includeHidden: boolean,
): FolderUploadPlan | null {
  if (!files.length) return null;

  const root = folderRootName(files);
  if (!root) return null;

  const picked: { file: File; rel: string }[] = [];
  for (const file of files) {
    const relPath = relativePath(file);
    if (!relPath.startsWith(`${root}/`)) continue;
    const rel = relPath.slice(root.length + 1);
    if (!rel) continue;
    if (!includeHidden && hasHiddenPathSegment(rel)) continue;
    picked.push({ file, rel });
  }

  if (!picked.length) return null;

  picked.sort((a, b) => a.rel.localeCompare(b.rel));
  return {
    folderName: root,
    files: picked.map((p) => p.file),
    relativeNames: picked.map((p) => p.rel),
    totalSize: picked.reduce((sum, p) => sum + p.file.size, 0),
  };
}

function folderRootName(files: File[]): string {
  for (const file of files) {
    const rel = relativePath(file);
    const idx = rel.indexOf("/");
    if (idx > 0) return rel.slice(0, idx);
  }
  return "";
}

function relativePath(file: File): string {
  const rel = (file as any).webkitRelativePath as string | undefined;
  return rel && rel.length ? rel : file.name;
}

function hasHiddenPathSegment(rel: string): boolean {
  return rel.split("/").some((part) => part.startsWith("."));
}

export function fileToEntryJson(file: File): string {
  return JSON.stringify({
    entry_type: 4,
    name: file.name,
    size: file.size,
    modified_time: Math.floor(file.lastModified / 1000),
  });
}

export function notifySelectedFile(
  handleIndex: number,
  file: File,
  sessionId?: string,
) {
  pushEvent(
    "selected_files",
    {
      handleIndex: String(handleIndex),
      file: fileToEntryJson(file),
    },
    sessionId,
  );
}

export function notifySelectedFolder(
  plan: FolderUploadPlan,
  sessionId?: string,
) {
  lastFolderPlan = plan;
  pushEvent(
    "selected_folder",
    {
      folder_name: plan.folderName,
      total_size: String(plan.totalSize),
      file_count: String(plan.files.length),
    },
    sessionId,
  );
}

export type DownloadSaveTarget = {
  writable: {
    write(data: Blob | SourceBuffer): Promise<void>;
    close(): Promise<void>;
  };
};

/** User cancelled the save dialog. */
export type PickDownloadResult = DownloadSaveTarget | null | "unsupported";

async function openSaveFilePicker(
  suggestedName: string,
): Promise<PickDownloadResult> {
  const picker = (window as any).showSaveFilePicker;
  if (typeof picker !== "function") {
    return "unsupported";
  }
  try {
    const handle = await picker({ suggestedName });
    const writable = await handle.createWritable();
    return { writable };
  } catch (e: any) {
    if (e?.name === "AbortError") return null;
    console.warn("showSaveFilePicker failed", e);
    return "unsupported";
  }
}

export function remoteDownloadSuggestedName(
  fileName: string,
  isFolderDownload: boolean,
): string {
  const base = fileName || "download";
  return isFolderDownload ? `${base}.zip` : base;
}

/** Prompt for a save path before the transfer starts (File System Access API). */
export async function pickDownloadSaveTarget(
  suggestedName: string,
): Promise<PickDownloadResult> {
  return openSaveFilePicker(suggestedName);
}

export async function writeDownloadChunk(
  target: DownloadSaveTarget,
  data: Uint8Array,
): Promise<void> {
  await target.writable.write(new Blob([data]));
}

export async function closeDownloadTarget(
  target: DownloadSaveTarget,
): Promise<void> {
  await target.writable.close();
}

export async function saveDownload(
  filename: string,
  data: Uint8Array,
  target?: DownloadSaveTarget,
): Promise<"ok" | "cancelled"> {
  const blob = new Blob([data]);
  if (target) {
    await target.writable.write(blob);
    await target.writable.close();
    return "ok";
  }
  const pick = await openSaveFilePicker(filename);
  if (pick === null) return "cancelled";
  if (pick !== "unsupported") {
    await pick.writable.write(blob);
    await pick.writable.close();
    return "ok";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "ok";
}

export async function readFileChunk(
  file: File,
  offset: number,
  size: number,
): Promise<Uint8Array> {
  const slice = file.slice(offset, offset + size);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}
