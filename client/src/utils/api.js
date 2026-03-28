import { auth } from './firebase';

export async function apiFetch(url, options = {}) {
  const user = auth.currentUser;
  const headers = { ...options.headers };

  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Token refresh failed
    }
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && user) {
    if (!options._retried) {
      try {
        const newToken = await user.getIdToken(true);
        const retryHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
        const retryRes = await fetch(url, { ...options, headers: retryHeaders, _retried: true });
        if (retryRes.status !== 401) return retryRes;
      } catch {}
    }
    try { await auth.signOut(); } catch {}
  }

  return response;
}

export const api = {
  get: (url) => apiFetch(url),
  post: (url, body) => apiFetch(url, { method: 'POST', body }),
  patch: (url, body) => apiFetch(url, { method: 'PATCH', body }),
  put: (url, body) => apiFetch(url, { method: 'PUT', body }),
  delete: (url, body) => body
    ? apiFetch(url, { method: 'DELETE', body })
    : apiFetch(url, { method: 'DELETE' }),
};
