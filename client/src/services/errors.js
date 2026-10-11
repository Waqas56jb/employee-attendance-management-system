/** Error type shared by mock and real services so the UI handles both the same way. */
export class ServiceError extends Error {
  constructor(message, code = 'UNKNOWN', status = 400) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
  }
}

export const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  UNAVAILABLE_IN_DEMO: 'UNAVAILABLE_IN_DEMO',
  NETWORK: 'NETWORK',
};

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ServiceError) return error.message;
  if (error?.message && typeof error.message === 'string') return error.message;
  return fallback;
}
