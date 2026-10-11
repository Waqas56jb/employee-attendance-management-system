/**
 * Runtime configuration from Vite environment variables (see .env.example).
 * Only non-secret values belong here — everything is shipped to the browser.
 */
export const config = {
  appName: 'ShiftLine',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  requireLocation: import.meta.env.VITE_REQUIRE_LOCATION === 'true',
};
