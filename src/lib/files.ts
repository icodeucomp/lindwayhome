import { FileUploader } from "./uploader";

type FileNode = {
  filename: string;
  originalName: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
  alt: string;
  isMoved: boolean;
  [key: string]: unknown;
};

const isFileNode = (node: unknown): node is FileNode => {
  return typeof node === "object" && node !== null && "filename" in node && "isMoved" in node && "path" in node;
};

const uploader = new FileUploader();

export const resolveFiles = async <T>(existingData: unknown, incomingData: T, folder: string): Promise<T> => {
  // Step 1: Collect all file nodes currently stored
  const existingFiles = new Map<string, FileNode>();
  const collectExisting = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (isFileNode(node)) {
      existingFiles.set(node.filename, node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(collectExisting);
      return;
    }
    Object.values(node as object).forEach(collectExisting);
  };
  collectExisting(existingData);

  // Step 2: Walk the incoming data, move any temp file nodes
  const seenFilenames = new Set<string>();
  const traverse = async (node: unknown): Promise<unknown> => {
    if (!node || typeof node !== "object") return node;
    if (isFileNode(node)) {
      seenFilenames.add(node.filename);
      return node.isMoved ? node : await uploader.moveFromTemp(node, folder);
    }
    if (Array.isArray(node)) return Promise.all(node.map(traverse));
    const entries = await Promise.all(Object.entries(node as object).map(async ([key, val]) => [key, await traverse(val)]));
    return Object.fromEntries(entries);
  };

  // Step 3: Delete orphaned files (existed before, not referenced now)
  const resolved = await traverse(incomingData);
  const deletedFiles = [...existingFiles.values()].filter((f) => !seenFilenames.has(f.filename));
  await Promise.all(deletedFiles.map((file) => uploader.deleteFile(file.path)));

  return resolved as T;
};
