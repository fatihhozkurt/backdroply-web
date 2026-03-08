import { Globe } from "lucide-react";
import { useI18n } from "../i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 transition hover:border-sky-300/40"
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      type="button"
    >
      <Globe size={14} />
      {lang.toUpperCase()}
    </button>
  );
}
