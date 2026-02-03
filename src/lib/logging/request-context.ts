import { randomUUID } from "crypto";

export interface RequestContext extends Record<string, unknown> {
  requestId: string;
  route: string;
  feature?: string;
  userId?: string;
}

export function createRequestContext(input: {
  route: string;
  feature?: string;
  userId?: string;
}): RequestContext {
  return {
    requestId: randomUUID(),
    route: input.route,
    feature: input.feature,
    userId: input.userId,
  };
}
