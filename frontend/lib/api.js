export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

let refreshPromise = null;

function buildUrl(path) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function executeRequest(path, options = {}) {
  const {
    body,
    headers = {},
    credentials = "include",
    cache = "no-store",
    skipAuthRefresh = false,
    ...rest
  } = options;
  const requestHeaders = new Headers(headers);

  let payloadBody = body;
  if (body && !(body instanceof FormData) && typeof body !== "string" && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
    payloadBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    body: payloadBody,
    headers: requestHeaders,
    credentials,
    cache
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  return {
    response,
    payload,
    skipAuthRefresh,
    credentials
  };
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = executeRequest("/auth/refresh", {
      method: "POST",
      skipAuthRefresh: true
    })
      .then(({ response, payload }) => {
        if (!response.ok || payload?.success === false) {
          const error = new Error(payload?.error?.message || payload?.message || "Session refresh failed");
          error.status = response.status;
          error.payload = payload;
          throw error;
        }

        return payload?.data ?? null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const result = await executeRequest(path, options);
  const { response, payload, skipAuthRefresh, credentials } = result;

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    credentials === "include" &&
    !String(path).startsWith("/auth/")
  ) {
    try {
      await refreshSession();
      const retried = await executeRequest(path, { ...options, skipAuthRefresh: true });

      if (!retried.response.ok || retried.payload?.success === false) {
        const error = new Error(retried.payload?.error?.message || retried.payload?.message || "Request failed");
        error.status = retried.response.status;
        error.payload = retried.payload;
        throw error;
      }

      return retried.payload?.data ?? null;
    } catch (_refreshError) {
      // Fall through to the original unauthorized error shape below.
    }
  }

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error?.message || payload?.message || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload?.data ?? null;
}

export function apiGet(path, options = {}) {
  return apiRequest(path, { ...options, method: "GET" });
}

export function apiPost(path, body, options = {}) {
  return apiRequest(path, { ...options, method: "POST", body });
}

export function apiPatch(path, body, options = {}) {
  return apiRequest(path, { ...options, method: "PATCH", body });
}

export function apiDelete(path, options = {}) {
  return apiRequest(path, { ...options, method: "DELETE" });
}
