import { BarChart3, Cookie, Megaphone, Settings2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import {
  CONSENT_UPDATED_EVENT,
  OPEN_CONSENT_EVENT,
  normalizeConsent,
  readConsent,
  writeConsent
} from "../lib/consent";

const CATEGORY_META = {
  necessary: { icon: ShieldCheck },
  analytics: { icon: BarChart3 },
  marketing: { icon: Megaphone },
  functional: { icon: Settings2 }
};

function PolicyLinks({ t }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
      <a href="/legal/cookies.html" target="_blank" rel="noreferrer" className="hover:text-sky-200">
        {t.cookiePolicy}
      </a>
      <a href="/legal/privacy.html" target="_blank" rel="noreferrer" className="hover:text-sky-200">
        {t.privacyPolicy}
      </a>
      <a href="/legal/terms.html" target="_blank" rel="noreferrer" className="hover:text-sky-200">
        {t.termsOfUse}
      </a>
    </div>
  );
}

function ConsentToggle({ checked, disabled, label, desc, icon: Icon, onChange }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-md bg-slate-800 p-1 text-sky-200">
            <Icon size={14} />
          </span>
          <div>
            <div className="text-sm font-medium text-slate-100">{label}</div>
            <div className="text-xs text-slate-400">{desc}</div>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition ${
            checked
              ? "border-sky-300/50 bg-sky-400/40"
              : "border-slate-600 bg-slate-800"
          } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
          aria-label={label}
          aria-pressed={checked}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
              checked ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function UserConsentNotice() {
  const { t } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [consent, setConsent] = useState(() => normalizeConsent());

  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      setConsent(existing);
      setBannerOpen(false);
    } else {
      setBannerOpen(true);
    }
    setHydrated(true);

    const onOpen = () => {
      const latest = readConsent();
      if (latest) {
        setConsent(latest);
      }
      setPrefsOpen(true);
      setBannerOpen(false);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  function persist(nextConsent) {
    const saved = writeConsent(nextConsent);
    setConsent(saved);
    setBannerOpen(false);
    setPrefsOpen(false);
    window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, { detail: saved }));
  }

  function acceptAll() {
    persist({
      ...consent,
      analytics: true,
      marketing: true,
      functional: true,
      source: "accept_all"
    });
  }

  function rejectOptional() {
    persist({
      ...consent,
      analytics: false,
      marketing: false,
      functional: false,
      source: "reject_optional"
    });
  }

  function savePreferences() {
    persist({
      ...consent,
      source: "preferences"
    });
  }

  if (!hydrated) {
    return null;
  }

  return (
    <>
      {bannerOpen && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(96%,780px)] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-lg sm:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl border border-slate-700 bg-slate-900/70 p-2 text-sky-200">
              <Cookie size={16} />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-100">{t.cookieBannerTitle}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{t.cookieBannerText}</p>
              <PolicyLinks t={t} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-400"
              onClick={rejectOptional}
            >
              {t.cookieRejectAll}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-400"
              onClick={() => {
                setPrefsOpen(true);
                setBannerOpen(false);
              }}
            >
              {t.cookieManage}
            </button>
            <button
              type="button"
              className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
              onClick={acceptAll}
            >
              {t.cookieAcceptAll}
            </button>
          </div>
        </div>
      )}

      {prefsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-[0_30px_90px_rgba(2,6,23,.7)] sm:p-6">
            <div className="mb-1 text-lg font-semibold text-slate-100">{t.cookiePrefsTitle}</div>
            <p className="mb-4 text-xs text-slate-300">{t.cookiePrefsDesc}</p>

            <div className="space-y-2">
              <ConsentToggle
                checked
                disabled
                icon={CATEGORY_META.necessary.icon}
                label={t.cookieCategoryNecessary}
                desc={t.cookieCategoryNecessaryDesc}
              />
              <ConsentToggle
                checked={consent.analytics}
                icon={CATEGORY_META.analytics.icon}
                label={t.cookieCategoryAnalytics}
                desc={t.cookieCategoryAnalyticsDesc}
                onChange={() => setConsent((prev) => ({ ...prev, analytics: !prev.analytics }))}
              />
              <ConsentToggle
                checked={consent.marketing}
                icon={CATEGORY_META.marketing.icon}
                label={t.cookieCategoryMarketing}
                desc={t.cookieCategoryMarketingDesc}
                onChange={() => setConsent((prev) => ({ ...prev, marketing: !prev.marketing }))}
              />
              <ConsentToggle
                checked={consent.functional}
                icon={CATEGORY_META.functional.icon}
                label={t.cookieCategoryFunctional}
                desc={t.cookieCategoryFunctionalDesc}
                onChange={() => setConsent((prev) => ({ ...prev, functional: !prev.functional }))}
              />
            </div>

            <PolicyLinks t={t} />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-400"
                onClick={rejectOptional}
              >
                {t.cookieRejectAll}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-400"
                onClick={acceptAll}
              >
                {t.cookieAcceptAll}
              </button>
              <button
                type="button"
                className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
                onClick={savePreferences}
              >
                {t.cookieSavePrefs}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"
                onClick={() => {
                  if (readConsent()) {
                    setPrefsOpen(false);
                    return;
                  }
                  setPrefsOpen(false);
                  setBannerOpen(true);
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {!bannerOpen && (
        <button
          type="button"
          className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/85 px-3 py-2 text-[11px] text-slate-200 shadow-lg backdrop-blur transition hover:border-slate-500"
          onClick={() => setPrefsOpen(true)}
        >
          <Cookie size={14} />
          {t.cookieManage}
        </button>
      )}
    </>
  );
}
