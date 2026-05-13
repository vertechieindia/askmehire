export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  error: null;
  requestId: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorEnvelope = {
  success: false;
  data: null;
  error: ApiErrorBody;
  requestId: string;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function okEnvelope<T>(data: T, requestId: string): ApiSuccessEnvelope<T> {
  return { success: true, data, error: null, requestId };
}

export function errEnvelope(
  code: string,
  message: string,
  requestId: string,
  details?: unknown
): ApiErrorEnvelope {
  return {
    success: false,
    data: null,
    error: details !== undefined ? { code, message, details } : { code, message },
    requestId
  };
}
