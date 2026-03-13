import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { openCookiePreferences } from "../lib/consent";

export default function GlobalFooter() {
  const { t, lang } = useI18n();
  const legalQuery = `?lang=${lang}`;
  const contactLabel = t.footerContact || (lang === "tr" ? "İletişim" : "Contact");

  return (
    <footer className="mx-auto mt-8 w-full max-w-7xl px-4 pb-6 sm:px-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 px-4 py-5 text-xs text-slate-400">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-2 text-center">
          <div className="text-slate-300">{t.footerInfo}</div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={`/legal/cookies.html${legalQuery}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-sky-200"
            >
              {t.footerCookie}
            </a>
            <a
              href={`/legal/privacy.html${legalQuery}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-sky-200"
            >
              {t.footerPrivacy}
            </a>
            <a
              href={`/legal/terms.html${legalQuery}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-sky-200"
            >
              {t.footerTerms}
            </a>
            <Link
              to="/contact"
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-sky-200"
            >
              {contactLabel}
            </Link>
            <button
              type="button"
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-sky-200"
              onClick={openCookiePreferences}
            >
              {t.cookieManage}
            </button>
          </div>
          <div>
            {t.footerCopy} (c) {new Date().getFullYear()} Fatih Ozkurt
          </div>
          <div className="max-w-2xl">{t.footerLegal}</div>
        </div>
      </div>
    </footer>
  );
}
