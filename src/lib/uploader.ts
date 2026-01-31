import { writeFile, mkdir } from "fs/promises";

import { join } from "path";

import { existsSync } from "fs";
import { API_BASE_URL } from "@/utils";

interface FileUploaderConfig {
  baseUploadPath?: string;
  allowedTypes?: string[];
  maxFileSize?: number;
}

interface UploadedFileInfo {
  filename: string;
  originalName: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
  alt: string;
}

export class FileUploader {
  private baseUploadPath: string;
  private allowedTypes: string[];
  private maxFileSize: number;

  constructor(config: FileUploaderConfig = {}) {
    this.baseUploadPath = config.baseUploadPath || "public/uploads";
    this.allowedTypes = config.allowedTypes || ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    this.maxFileSize = config.maxFileSize || 5 * 1024 * 1024;
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split(".").pop()?.toLowerCase() || "";
    return `${timestamp}_${random}.${extension}`;
  }

  private async ensureUploadDirectory(subPath = ""): Promise<string> {
    const fullPath = join(process.cwd(), this.baseUploadPath, subPath);
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
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${this.allowedTypes.join(", ")}`);
    }

    return true;
  }

  async uploadFile(file: File, subPath = "products"): Promise<UploadedFileInfo> {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      await this.validateFile(file, buffer);

      const fileName = this.generateFileName(file.name);
      const uploadDir = await this.ensureUploadDirectory(subPath);
      const filePath = join(uploadDir, fileName);

      await writeFile(filePath, buffer);

      return {
        filename: fileName,
        originalName: file.name,
        url: `${API_BASE_URL}/uploads/${subPath}/${fileName}`,
        path: `/uploads/${subPath}/${fileName}`,
        size: buffer.length,
        mimeType: file.type,
        alt: fileName,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Upload failed: ${errorMessage}`);
    }
  }

  async uploadMultipleFiles(files: File[], subPath = "products"): Promise<UploadedFileInfo[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, subPath));
    return Promise.all(uploadPromises);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = join(process.cwd(), "public", filePath);
      if (existsSync(fullPath)) {
        const { unlink } = await import("fs/promises");
        await unlink(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Upload failed: ${errorMessage}`);
    }
  }
}
