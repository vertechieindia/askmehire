export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(code, message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(code, message, 403);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests", code = "RATE_LIMITED") {
    super(code, message, 429);
    this.name = "RateLimitError";
  }
}
