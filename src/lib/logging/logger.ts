import { Logging } from "@google-cloud/logging";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogMetadata = Record<string, unknown>;

const LOG_NAME = "fitnessai";
const INFO_SAMPLE_RATE = Number(process.env.LOG_INFO_SAMPLE_RATE ?? "0.01");

let loggingClient: Logging | null = null;

function getLoggingClient(): Logging {
  if (!loggingClient) {
    loggingClient = new Logging({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
  }
  return loggingClient;
}

function shouldSample(rate: number): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

function formatTraceId(traceHeader?: string): string | undefined {
  if (!traceHeader) return undefined;
  const match = traceHeader.match(/^([^/]+)/);
  return match ? match[1] : undefined;
}

async function writeLog(
  level: LogLevel,
  message: string,
  metadata: LogMetadata = {},
  traceHeader?: string
): Promise<void> {
  const payload = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    message,
    ...metadata,
  };

  if (process.env.NODE_ENV !== "production") {
    const logFn =
      level === "error" || level === "fatal"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    logFn(JSON.stringify({ level, ...payload }));
    return;
  }

  try {
    const logging = getLoggingClient();
    const log = logging.log(LOG_NAME);
    const entryMetadata: Record<string, unknown> = {
      severity: level.toUpperCase(),
    };

    const traceId = formatTraceId(traceHeader);
    if (traceId && process.env.GOOGLE_CLOUD_PROJECT) {
      entryMetadata["logging.googleapis.com/trace"] = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/traces/${traceId}`;
    }

    const entry = log.entry(entryMetadata, payload);
    await log.write(entry);
  } catch (error) {
    console.error(JSON.stringify({ level, ...payload, loggingError: String(error) }));
  }
}

export const logger = {
  debug: (message: string, metadata?: LogMetadata, traceHeader?: string) => {
    if (!shouldSample(INFO_SAMPLE_RATE)) return Promise.resolve();
    return writeLog("debug", message, metadata, traceHeader);
  },
  info: (message: string, metadata?: LogMetadata, traceHeader?: string) => {
    if (!shouldSample(INFO_SAMPLE_RATE)) return Promise.resolve();
    return writeLog("info", message, metadata, traceHeader);
  },
  warn: (message: string, metadata?: LogMetadata, traceHeader?: string) =>
    writeLog("warn", message, metadata, traceHeader),
  error: (message: string, metadata?: LogMetadata, traceHeader?: string) =>
    writeLog("error", message, metadata, traceHeader),
  fatal: (message: string, metadata?: LogMetadata, traceHeader?: string) =>
    writeLog("fatal", message, metadata, traceHeader),
};
