import { NextResponse } from "next/server";

import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";
import { checkAIConfig, checkFirestore, checkRedis, getAnalysisConfigHealthDetails } from "@/lib/logging/health-check";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const traceHeader = request.headers.get("x-cloud-trace-context") ?? undefined;
  const context = createRequestContext({ route: "/api/health", feature: "healthCheck" });
  const analysisConfigDetails = await getAnalysisConfigHealthDetails();

  const checks = {
    status: "ok" as const,
    checks: {
      database: await checkFirestore(),
      ai: await checkAIConfig(),
      redis: await checkRedis(),
      analysisConfig: analysisConfigDetails.status,
    },
    timestamp: new Date().toISOString(),
  };

  const isHealthy =
    checks.checks.database === "ok" &&
    checks.checks.ai === "ok" &&
    checks.checks.redis === "ok" &&
    checks.checks.analysisConfig === "ok";

  const logPayload = checks.checks.analysisConfig === "degraded"
    ? {
        ...context,
        ...checks,
        analysisConfigMismatchCount: analysisConfigDetails.mismatchCount,
        analysisConfigSampleMismatches: analysisConfigDetails.sampleMismatches,
      }
    : { ...context, ...checks };

  await logger.info("Health check", logPayload, traceHeader);

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
  });
}
