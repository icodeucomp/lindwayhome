import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { checkAuth, FileUploader, logger } from "@/lib";

import { ConfigService } from "@/services";

import { Files } from "@/types";

const uploader = new FileUploader();

// GET - Fetch all configuration parameters
export async function GET(request: NextRequest) {
  const authError = await checkAuth(request, "/config/parameters");
  if (authError) return authError;

  try {
    const configParameters = await ConfigService.getAllConfigurations();
    return NextResponse.json({ success: true, data: configParameters }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /config/parameters error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// PUT - Update configuration parameters
export async function PUT(request: NextRequest) {
  const authError = await checkAuth(request, "/config/parameters");
  if (authError) return authError;

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();

    logger.info("API Request /config/parameters", {
      method: request.method,
      body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const existingConfig = await ConfigService.getAllConfigurations();

    const collectFiles = (node: unknown): Files[] => {
      if (!node || typeof node !== "object") return [];
      if ("filename" in node && "isMoved" in node) return [node as Files];
      if (Array.isArray(node)) return node.flatMap(collectFiles);
      return Object.values(node).flatMap(collectFiles);
    };

    const existingFiles = collectFiles(existingConfig);
    const incomingFiles = collectFiles(body);

    const deletedFiles = existingFiles.filter((existing) => !incomingFiles.some((incoming) => incoming.filename === existing.filename));

    const replaceTempFiles = async (node: unknown): Promise<unknown> => {
      if (!node || typeof node !== "object") return node;
      if ("filename" in node && "isMoved" in node) {
        const file = node as Files;
        return file.isMoved ? file : await uploader.moveFromTemp(file, "config");
      }
      if (Array.isArray(node)) return Promise.all(node.map(replaceTempFiles));
      const entries = await Promise.all(Object.entries(node).map(async ([key, val]) => [key, await replaceTempFiles(val)]));
      return Object.fromEntries(entries);
    };

    const updatedBody = (await replaceTempFiles(body)) as Record<string, Prisma.InputJsonValue>;

    await Promise.all([ConfigService.updateConfigValues(updatedBody), ...deletedFiles.map((file) => uploader.deleteFile(file.path))]);

    logger.info("API Response /config/parameters", {
      message: "Parameter has been updated successfully",
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, message: "Parameter has been updated successfully" }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /config/parameters error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
