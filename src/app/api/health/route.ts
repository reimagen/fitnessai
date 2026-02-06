import { NextResponse } from "next/server";

import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";
import { checkAIConfig, checkFirestore, checkRedis } from "@/lib/logging/health-check";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const traceHeader = request.headers.get("x-cloud-trace-context") ?? undefined;
  const context = createRequestContext({ route: "/api/health", feature: "healthCheck" });

  const checks = {
    status: "ok" as const,
    checks: {
      database: await checkFirestore(),
      ai: await checkAIConfig(),
      redis: await checkRedis(),
    },
    timestamp: new Date().toISOString(),
  };

  const isHealthy = checks.checks.database === "ok" && checks.checks.ai === "ok" && checks.checks.redis === "ok";

  await logger.info("Health check", { ...context, ...checks }, traceHeader);

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
  });
}
