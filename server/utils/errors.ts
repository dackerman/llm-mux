/**
 * Base custom error class with status code and original error
 */
export class CustomError extends Error {
  statusCode: number;
  originalError?: any;

  constructor(message: string, statusCode: number = 500, originalError?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.originalError = originalError;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error for when a resource is not found
 */
export class NotFoundError extends CustomError {
  constructor(message: string, originalError?: any) {
    super(message, 404, originalError);
  }
}

/**
 * Error for when input validation fails
 */
export class ValidationError extends CustomError {
  constructor(message: string, originalError?: any) {
    super(message, 400, originalError);
  }
}

/**
 * Error for when authentication fails
 */
export class AuthenticationError extends CustomError {
  constructor(message: string, originalError?: any) {
    super(message, 401, originalError);
  }
}

/**
 * Error for when the user doesn't have permission
 */
export class ForbiddenError extends CustomError {
  constructor(message: string, originalError?: any) {
    super(message, 403, originalError);
  }
}

/**
 * Error for when an external service fails
 */
export class ExternalServiceError extends CustomError {
  constructor(message: string, originalError?: any) {
    super(message, 502, originalError);
  }
}

/**
 * Error for when an API key is missing for an LLM provider
 */
export class ApiKeyMissingError extends CustomError {
  constructor(provider: string, originalError?: any) {
    super(`API key for '${provider}' is not set. Please set it in settings.`, 400, originalError);
  }
}