import { writeFile, mkdir, rename, readdir, unlink, stat } from "fs/promises";
import { join, resolve } from "path";
import { existsSync } from "fs";

interface FileUploaderConfig {
  baseUploadPath?: string;
  allowedTypes?: string[];
  maxFileSize?: number;
  tempTTLMs?: number; // how long before temp files are orphaned (default: 1hr)
}

interface UploadedFileInfo {
  filename: string;
  originalName: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
  alt: string;
  isMoved: boolean;
}

export class FileUploader {
  private baseUploadPath: string;
  private allowedTypes: string[];
  private maxFileSize: number;
  private tempTTLMs: number;
  private baseURL: string;

  constructor(config: FileUploaderConfig = {}) {
    this.baseUploadPath = config.baseUploadPath || process.env.NEXT_PUBLIC_UPLOADS_PATH || "uploads";
    this.allowedTypes = config.allowedTypes || ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    this.maxFileSize = config.maxFileSize || 5 * 1024 * 1024;
    this.tempTTLMs = config.tempTTLMs || 60 * 60 * 1000;
    this.baseURL = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_BASE_URL || "" : "";
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split(".").pop()?.toLowerCase() || "";
    return `${timestamp}_${random}.${extension}`;
  }

  private async ensureUploadDirectory(subPath = ""): Promise<string> {
    const fullPath = join(this.baseUploadPath, subPath);
    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true });
    }
    return fullPath;
  }

  private async validateFile(file: File, buffer: Buffer): Promise<boolean> {
    if (buffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed: ${this.allowedTypes.join(", ")}`);
    }
    return true;
  }

  private async isInsideBasePath(base: string, target: string): Promise<boolean> {
    const basePath = resolve(base);
    const targetPath = resolve(target);

    return targetPath.startsWith(basePath + "/");
  }

  async uploadToTemp(file: File): Promise<UploadedFileInfo> {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await this.validateFile(file, buffer);

      const fileName = this.generateFileName(file.name);
      const tempDir = await this.ensureUploadDirectory("temp");
      const filePath = join(tempDir, fileName);

      await writeFile(filePath, buffer);

      return {
        filename: fileName,
        originalName: file.name,
        url: `${this.baseURL}/uploads/temp/${fileName}`,
        path: `/uploads/temp/${fileName}`,
        size: buffer.length,
        mimeType: file.type,
        alt: file.name,
        isMoved: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Temp upload failed: ${errorMessage}`);
    }
  }

  async moveFromTemp(file: UploadedFileInfo, destinationSubPath: string): Promise<UploadedFileInfo> {
    try {
      const tempFilePath = join(this.baseUploadPath, "temp", file.filename);

      if (!existsSync(tempFilePath)) {
        throw new Error(`Temp file not found: ${file.filename}`);
      }

      const destDir = await this.ensureUploadDirectory(destinationSubPath);
      const destFilePath = join(destDir, file.filename);

      await rename(tempFilePath, destFilePath);

      return {
        filename: file.filename,
        originalName: file.originalName,
        url: `${this.baseURL}/uploads/${destinationSubPath}/${file.filename}`,
        path: `/uploads/${destinationSubPath}/${file.filename}`,
        size: (await stat(destFilePath)).size,
        mimeType: file.mimeType,
        alt: file.originalName,
        isMoved: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Move from temp failed: ${errorMessage}`);
    }
  }

  async cleanupTempFiles(): Promise<number> {
    const tempDir = join(this.baseUploadPath, "temp");
    if (!existsSync(tempDir)) return 0;

    const files = await readdir(tempDir);
    const now = Date.now();
    let deleted = 0;

    await Promise.all(
      files.map(async (file) => {
        const filePath = join(tempDir, file);
        const { mtimeMs } = await stat(filePath);
        if (now - mtimeMs > this.tempTTLMs) {
          await unlink(filePath);
          deleted++;
        }
      }),
    );

    return deleted;
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const relativePath = filePath.replace(/^\/?uploads\/?/, "");
      const fullPath = join(this.baseUploadPath, relativePath);

      if (!this.isInsideBasePath(this.baseUploadPath, fullPath)) throw new Error("Invalid path: outside of upload directory");

      if (!existsSync(fullPath)) return false;

      const { unlink: unlinkFn } = await import("fs/promises");
      await unlinkFn(fullPath);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Delete failed: ${errorMessage}`);
    }
  }

  async deleteFolder(folderPath: string): Promise<boolean> {
    try {
      const relativePath = folderPath.replace(/^\/?uploads\/?/, "");
      const fullPath = join(this.baseUploadPath, relativePath);

      if (!this.isInsideBasePath(this.baseUploadPath, fullPath)) throw new Error("Invalid path: outside of upload directory");

      if (!existsSync(fullPath)) return false;

      const { rm: rmFn } = await import("fs/promises");
      await rmFn(fullPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Delete folder failed: ${errorMessage}`);
    }
  }
}
