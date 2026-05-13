import type { ResumeGenerationResult } from "@/lib/types";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  requestId: string;
};

export function unwrapApiData<T>(json: unknown): T {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid API response.");
  }
  const envelope = json as ApiEnvelope<T>;
  if (!envelope.success || envelope.data === null) {
    throw new Error(envelope.error?.message ?? "Request failed.");
  }
  return envelope.data;
}

export function unwrapResumeGeneration(json: unknown): ResumeGenerationResult {
  return unwrapApiData<ResumeGenerationResult>(json);
}

export async function fetchApiEnvelope<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Invalid JSON response (${res.status})`);
  }
  const env = json as ApiEnvelope<T>;
  if (!res.ok) {
    throw new Error(env.error?.message ?? `Request failed (${res.status})`);
  }
  return unwrapApiData(json);
}
