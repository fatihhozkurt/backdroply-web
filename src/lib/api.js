import axios from "axios";

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

function normalizeApiBase(url) {
  if (typeof window === "undefined") {
    return url;
  }
  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  if (!isLocalHost) {
    return url;
  }
  if (typeof url !== "string") {
    return url;
  }
  return url.replace("http://localhost:", "http://127.0.0.1:");
}

const API_BASE = normalizeApiBase(RAW_API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN"
});

export function setAuthToken(token) {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function toFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") {
      return;
    }
    fd.append(k, v);
  });
  return fd;
}
