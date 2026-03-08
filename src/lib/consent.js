export const CONSENT_STORAGE_KEY = "backdroply_cookie_consent_v1";
export const CONSENT_VERSION = "2026-03-07";
export const OPEN_CONSENT_EVENT = "backdroply:open-cookie-preferences";
export const CONSENT_UPDATED_EVENT = "backdroply:consent-updated";

function parseStoredConsent(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizeConsent(consent) {
  const base = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
    updatedAt: new Date().toISOString(),
    source: "preferences"
  };
  if (!consent || typeof consent !== "object") {
    return base;
  }
  return {
    ...base,
    ...consent,
    necessary: true,
    analytics: Boolean(consent.analytics),
    marketing: Boolean(consent.marketing),
    functional: Boolean(consent.functional)
  };
}

export function readConsent() {
  if (typeof window === "undefined") {
    return null;
  }
  const parsed =
    parseStoredConsent(localStorage.getItem(CONSENT_STORAGE_KEY)) ||
    parseStoredConsent(localStorage.getItem("clipcut_cookie_consent_v1"));
  if (parsed) {
    return normalizeConsent(parsed);
  }
  const legacyAccepted =
    localStorage.getItem("backdroply_consent_ok")
    || localStorage.getItem("backdroply_cookie_ok")
    || localStorage.getItem("clipcut_consent_ok")
    || localStorage.getItem("clipcut_cookie_ok");
  if (!legacyAccepted) {
    return null;
  }
  return normalizeConsent({
    analytics: true,
    functional: true,
    marketing: false,
    source: "legacy"
  });
}

export function writeConsent(consent) {
  if (typeof window === "undefined") {
    return normalizeConsent(consent);
  }
  const normalized = normalizeConsent(consent);
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(normalized));
  localStorage.setItem("backdroply_consent_ok", "1");
  localStorage.setItem("backdroply_cookie_ok", "1");
  localStorage.setItem("backdroply_cookie_analytics", normalized.analytics ? "1" : "0");
  localStorage.setItem("backdroply_cookie_marketing", normalized.marketing ? "1" : "0");
  localStorage.setItem("backdroply_cookie_functional", normalized.functional ? "1" : "0");
  localStorage.setItem("clipcut_consent_ok", "1");
  localStorage.setItem("clipcut_cookie_ok", "1");
  localStorage.setItem("clipcut_cookie_analytics", normalized.analytics ? "1" : "0");
  localStorage.setItem("clipcut_cookie_marketing", normalized.marketing ? "1" : "0");
  localStorage.setItem("clipcut_cookie_functional", normalized.functional ? "1" : "0");
  return normalized;
}

export function openCookiePreferences() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT));
}
