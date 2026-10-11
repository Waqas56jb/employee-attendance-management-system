import { config } from './config';
import { ERROR_CODES, ServiceError } from './errors';
import { STORAGE_KEYS, readJSON } from '../utils/storage';

/**
 * Minimal JSON client for the future backend. Services call it only when
 * VITE_USE_MOCK_API=false. The backend is expected to identify the employee
 * from the bearer token and to enforce all authorization server-side.
 */
function getToken() {
  return (readJSON(STORAGE_KEYS.session, null, 'session') || readJSON(STORAGE_KEYS.session, null))?.token;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ServiceError('Unable to reach the server. Check your connection and try again.', ERROR_CODES.NETWORK, 0);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const code = response.status === 401 ? ERROR_CODES.UNAUTHENTICATED : data?.code || 'HTTP_ERROR';
    throw new ServiceError(data?.message || `Request failed (${response.status}).`, code, response.status);
  }
  return data;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
};
