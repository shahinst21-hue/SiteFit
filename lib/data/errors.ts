import type { ErrorCode, SafeSourceError } from "./contracts.ts";
export class SourceError extends Error {
  readonly safe: SafeSourceError;
  constructor(code: ErrorCode, status: number | null = null, retryable = false) {
    super(code); this.name = "SourceError"; this.safe = { code, status, retryable };
  }
}
export function safeError(error: unknown): SafeSourceError {
  return error instanceof SourceError ? error.safe : { code: "provider_unavailable", status: null, retryable: false };
}
