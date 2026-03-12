import { Coins, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import LanguageToggle from "./LanguageToggle";

export default function TopBar({ user, tokenBalance, onLogout }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-y-2 px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Link to="/" className="inline-flex min-w-0 items-center gap-2 truncate font-semibold text-slate-100">
            <Sparkles size={16} className="text-sky-300" />
            <span className="truncate">Backdroply</span>
          </Link>
          <Link to="/studio" className="whitespace-nowrap text-sm text-slate-300 transition hover:text-sky-300">
            {t.navStudio}
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <LanguageToggle />
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-100">
            <Coins size={14} />
            {t.token}: {tokenBalance ?? 0}
          </div>
          {user ? (
            <button
              type="button"
              className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500"
              onClick={onLogout}
            >
              {t.signOut}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
