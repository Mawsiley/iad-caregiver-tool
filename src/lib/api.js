// Client for the Netlify Function. On hosts without the function (e.g. GitHub Pages)
// every call fails with code NO_SERVER and the app keeps working on-device.
const API = '/.netlify/functions/api';

export class ApiError extends Error {
  constructor(code, status = 0) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export async function callApi(action, data = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(API, { method: 'POST', headers, body: JSON.stringify({ action, data }) });
  } catch {
    throw new ApiError('OFFLINE');
  }
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new ApiError('NO_SERVER', res.status);
  const json = await res.json().catch(() => null);
  if (!json) throw new ApiError('NO_SERVER', res.status);
  if (!res.ok || !json.ok) throw new ApiError(json.code || 'API_ERROR', res.status);
  return json;
}
