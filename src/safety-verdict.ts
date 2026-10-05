export interface SafetyVerdict {
  blocked: boolean;
  reason?: string;
  retryable?: boolean;
}

export class SafetyProviderUnavailableError extends Error {
  override name = "SafetyProviderUnavailableError";
}

export function isSafetyProviderUnavailableError(error: unknown): boolean {
  return error instanceof SafetyProviderUnavailableError ||
    (error instanceof Error && error.name === "SafetyProviderUnavailableError");
}

export function unavailableSafetyVerdict(production: boolean): SafetyVerdict {
  return production
    ? {
        blocked: true,
        reason: "safety_provider_unavailable",
        retryable: true,
      }
    : { blocked: false };
}

export function parseSafetyProviderVerdict(value: unknown): SafetyVerdict {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("provider returned an invalid verdict");
  }
  const candidate = value as { verdict?: unknown; reason?: unknown };
  if (candidate.verdict === "clean") return { blocked: false };
  if (candidate.verdict === "blocked") {
    return {
      blocked: true,
      reason: typeof candidate.reason === "string"
        ? candidate.reason.slice(0, 500)
        : "safety_provider_blocked",
    };
  }
  throw new Error("provider returned an invalid verdict");
}

/** A provider outage blocks publication without rejecting the artist's work. */
export function assertSafetyProviderAvailable(verdict: SafetyVerdict): void {
  if (verdict.retryable) {
    throw new SafetyProviderUnavailableError(
      verdict.reason ?? "safety_provider_unavailable",
    );
  }
}
