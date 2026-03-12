import { BarChart3, Cookie, Megaphone, Settings2, ShieldCheck, X } from "lucide-react";
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

function PolicyLinks({ t, lang }) {
  const legalQuery = `?lang=${lang}`;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
      <a href={`/legal/cookies.html${legalQuery}`} target="_blank" rel="noreferrer" className="hover:text-sky-200">
        {t.cookiePolicy}
      </a>
      <a href={`/legal/privacy.html${legalQuery}`} target="_blank" rel="noreferrer" className="hover:text-sky-200">
        {t.privacyPolicy}
      </a>
      <a href={`/legal/terms.html${legalQuery}`} target="_blank" rel="noreferrer" className="hover:text-sky-200">
        {t.termsOfUse}
      </a>
    </div>
  );
}

function ConsentToggle({ checked, disabled, label, desc, icon: Icon, onChange }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 shadow-[0_8px_24px_rgba(2,6,23,.35)]">
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
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition cursor-pointer ${
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

function LegalChip({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-full border border-slate-700/90 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-sky-200"
    >
      {children}
    </a>
  );
}

function BannerActions({ t, onAcceptAll, onRejectOptional, onOpenPrefs }) {
  return (
    <div className="mt-4 border-t border-slate-800/80 pt-3">
      <div className="mx-auto grid w-full max-w-[760px] grid-cols-1 gap-2 sm:grid-cols-3">
      <button
        type="button"
        className="inline-flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-slate-600 bg-slate-900/85 px-4 text-sm font-medium text-slate-200 transition hover:border-slate-400"
        onClick={onOpenPrefs}
      >
        {t.cookieManage}
      </button>
      <button
        type="button"
        className="inline-flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-slate-600 bg-slate-900/85 px-4 text-sm font-medium text-slate-200 transition hover:border-slate-400"
        onClick={onRejectOptional}
      >
        {t.cookieRejectAll}
      </button>
      <button
        type="button"
        className="inline-flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg bg-gradient-to-r from-cyan-300 to-sky-400 px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110"
        onClick={onAcceptAll}
      >
        {t.cookieAcceptAll}
      </button>
      </div>
    </div>
  );
}

function ActionButton({
  primary = false,
  onClick,
  children
}) {
  return (
    <button
      type="button"
      className={primary
        ? "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-cyan-300 to-sky-400 px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110"
        : "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition hover:border-slate-400"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ModalActions({ t, onSavePreferences, onRejectOptional, onAcceptAll, onClose }) {
  return (
    <div className="mt-5 border-t border-slate-800/80 pt-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ActionButton onClick={onClose}>{t.close}</ActionButton>
        <ActionButton onClick={onRejectOptional}>{t.cookieRejectAll}</ActionButton>
        <ActionButton onClick={onAcceptAll}>{t.cookieAcceptAll}</ActionButton>
        <ActionButton primary onClick={onSavePreferences}>{t.cookieSavePrefs}</ActionButton>
      </div>
    </div>
  );
}

export default function UserConsentNotice() {
  const { t, lang } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [consent, setConsent] = useState(() => normalizeConsent());

  function closePreferences() {
    if (readConsent()) {
      setPrefsOpen(false);
      return;
    }
    setPrefsOpen(false);
    setBannerOpen(true);
  }

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

  useEffect(() => {
    if (!prefsOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closePreferences();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prefsOpen]);

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
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(96%,820px)] -translate-x-1/2 rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 to-[#040f24]/95 p-4 shadow-[0_26px_80px_rgba(2,6,23,.75)] backdrop-blur-lg sm:p-5">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-slate-700 bg-slate-900/70 p-2 text-sky-200">
                <Cookie size={16} />
              </span>
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-100">{t.cookieBannerTitle}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{t.cookieBannerText}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LegalChip href={`/legal/cookies.html?lang=${lang}`}>{t.cookiePolicy}</LegalChip>
              <LegalChip href={`/legal/privacy.html?lang=${lang}`}>{t.privacyPolicy}</LegalChip>
              <LegalChip href={`/legal/terms.html?lang=${lang}`}>{t.termsOfUse}</LegalChip>
            </div>
            <BannerActions
              t={t}
              onAcceptAll={acceptAll}
              onRejectOptional={rejectOptional}
              onOpenPrefs={() => {
                setPrefsOpen(true);
                setBannerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {prefsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePreferences();
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-[0_30px_90px_rgba(2,6,23,.7)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-100">{t.cookiePrefsTitle}</div>
                <p className="mt-1 text-xs text-slate-300">{t.cookiePrefsDesc}</p>
              </div>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                onClick={closePreferences}
              >
                <X size={14} />
              </button>
            </div>

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

            <PolicyLinks t={t} lang={lang} />

            <ModalActions
              t={t}
              onSavePreferences={savePreferences}
              onRejectOptional={rejectOptional}
              onAcceptAll={acceptAll}
              onClose={closePreferences}
            />
          </div>
        </div>
      )}
    </>
  );
}
