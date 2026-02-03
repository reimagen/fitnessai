import { performance } from "node:perf_hooks";

import { logger } from "@/lib/logging/logger";
import type { RequestContext } from "@/lib/logging/request-context";

type ResultWithSuccess = {
  success?: boolean;
};

export async function withServerActionLogging<T>(
  context: RequestContext,
  action: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await action();
    const duration = Math.round(performance.now() - start);
    const success =
      typeof (result as ResultWithSuccess)?.success === "boolean"
        ? (result as ResultWithSuccess).success
        : undefined;
    const level = success === false ? "warn" : "info";

    await logger[level]("Server action completed", {
      ...context,
      duration,
      success,
    });

    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    await logger.error("Server action failed", {
      ...context,
      duration,
      error: String(error),
    });
    throw error;
  }
}
