import { NextRequest } from "next/server";

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logDir = path.join(process.cwd(), "logs");

const logFormat = winston.format.combine(winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston.format.errors({ stack: true }), winston.format.splat(), winston.format.json());

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`;
  }),
);

const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, "application-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "30d",
  maxSize: "20m",
  format: logFormat,
});

const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "30d",
  maxSize: "20m",
  level: "error",
  format: logFormat,
});

// NEW: Calculation rotate file transport
const calculationFileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, "calculation-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "30d",
  maxSize: "20m",
  format: logFormat,
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [fileRotateTransport, errorFileRotateTransport, calculationFileRotateTransport],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

// Helper function to log calculations with proper typing
export const logCalculation = (step: string, data: Record<string, unknown>) => {
  logger.info(`[CALCULATION] ${step}`, { calculation: true, ...data });
};

export const getClientIp = (request: NextRequest): string => {
  return request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "::1";
};

export const logRequest = (pathAPI: string, request: NextRequest, body: unknown, ip: string): void => {
  logger.info(pathAPI, {
    method: request.method,
    body,
    url: request.url,
    pathname: request.nextUrl.pathname,
    ip,
  });
};

export const logError = (pathAPI: string, processingTime: number, error: unknown): void => {
  const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
  const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";
  logger.error(pathAPI, { error: errorMessage, stack: errorStack, processingTime });
};

export const logResponse = (pathAPI: string, processingTime: number, data: unknown): void => {
  logger.info(pathAPI, { response: data, processingTime });
};
