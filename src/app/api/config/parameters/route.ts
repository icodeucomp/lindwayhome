import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { checkAuth, FileUploader, getClientIp, logError, logRequest, logResponse } from "@/lib";

import { ConfigService } from "@/services";

import { Files } from "@/types";

const uploader = new FileUploader();

// GET - Fetch all configuration parameters
export async function GET(request: NextRequest) {
  const pathAPI = "GET /config/parameters";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const configParameters = await ConfigService.getAllConfigs();
    return NextResponse.json({ success: true, data: configParameters }, { status: 200 });
  } catch (error) {
    logError(pathAPI, Date.now() - startTime, error);

    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// PUT - Update configuration parameters
export async function PUT(request: NextRequest) {
  const pathAPI = "PUT /config/parameters";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const existingConfig = await ConfigService.getConfigValue(Object.keys(body));

    const existingFiles = new Map<string, Files>();
    const collectExisting = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      if ("filename" in node && "isMoved" in node) {
        existingFiles.set((node as Files).filename, node as Files);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(collectExisting);
        return;
      }
      Object.values(node).forEach(collectExisting);
    };
    collectExisting(existingConfig);

    const seenFilenames = new Set<string>();

    const replaceTempFiles = async (node: unknown): Promise<unknown> => {
      if (!node || typeof node !== "object") return node;
      if ("filename" in node && "isMoved" in node) {
        const file = node as Files;
        seenFilenames.add(file.filename);
        return file.isMoved ? file : await uploader.moveFromTemp(file, "config");
      }
      if (Array.isArray(node)) return Promise.all(node.map(replaceTempFiles));
      const entries = await Promise.all(Object.entries(node).map(async ([key, val]) => [key, await replaceTempFiles(val)]));
      return Object.fromEntries(entries);
    };

    const updatedBody = (await replaceTempFiles(body)) as Record<string, Prisma.InputJsonValue>;

    const deletedFiles = [...existingFiles.values()].filter((f) => !seenFilenames.has(f.filename));

    await Promise.all([ConfigService.updateConfigValues(updatedBody), ...deletedFiles.map((file) => uploader.deleteFile(file.path))]);

    logResponse(pathAPI, Date.now() - startTime, { message: "Parameter has been updated successfully", data: body });

    return NextResponse.json({ success: true, message: "Parameter has been updated successfully" }, { status: 200 });
  } catch (error) {
    logError(pathAPI, Date.now() - startTime, error);

    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
