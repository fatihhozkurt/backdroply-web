import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, Scissors, Sparkles, Wand, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";

function BrushMiniVisual({ lang }) {
  return (
    <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-200">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] text-slate-950">Keep</span>
        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] text-slate-950">Erase</span>
      </div>
      <div className="relative h-20 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/80">
        <div className="absolute left-4 top-3 h-12 w-20 rounded-full bg-emerald-500/45 blur-[1px]" />
        <div className="absolute right-4 bottom-3 h-10 w-24 rounded-full bg-rose-500/45 blur-[1px]" />
      </div>
      <p className="text-[11px] text-slate-400">
        {lang === "tr"
          ? "Brush/Hibrit modunda panel görünür."
          : "Panel appears only in Brush/Hybrid mode."}
      </p>
    </div>
  );
}

export default function StudioFirstRunModal({ open, onClose }) {
  const { t, lang } = useI18n();
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => ([
    {
      key: "upload",
      icon: ImageIcon,
      title: lang === "tr" ? "1) Dosya yükle ve modu seç" : "1) Upload file and choose mode",
      desc: lang === "tr"
        ? "Video/görsel yükle. Çoğu senaryo için Auto idealdir."
        : "Upload video/image. Auto is best for most cases.",
      renderVisual: () => (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
            <div className="border-b border-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-slate-400">
              {t.beforeLabel || "Before"}
            </div>
            <img src="/samples/sample-image-before.jpg" alt="" className="h-36 w-full object-cover" draggable={false} />
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
            <div className="border-b border-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-slate-400">
              {t.afterLabel || "After"}
            </div>
            <img src="/samples/sample-image-after.jpg" alt="" className="h-36 w-full object-cover" draggable={false} />
          </div>
        </div>
      )
    },
    {
      key: "timeline",
      icon: Scissors,
      title: lang === "tr" ? "2) Video için kesit aralığını seç" : "2) Pick clip range for video",
      desc: lang === "tr"
        ? "Timeline üzerinden başlangıç-bitiş belirle. Sadece bu kesit işlenir."
        : "Set start/end on timeline. Only selected segment is processed.",
      renderVisual: () => (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
            <div className="border-b border-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-slate-400">
              {t.beforeLabel || "Before"}
            </div>
            <img src="/samples/sample-video-before-demo.frame1.jpg" alt="" className="h-36 w-full object-cover" draggable={false} />
          </div>
          <BrushMiniVisual lang={lang} />
        </div>
      )
    },
    {
      key: "run",
      icon: Sparkles,
      title: lang === "tr" ? "3) İşlemi başlat, sonucu önizle ve indir" : "3) Run, preview, then download",
      desc: lang === "tr"
        ? "İlerlemeyi yüzde olarak takip et, sonucu indirmeden önce kontrol et."
        : "Track progress by percentage and review output before download.",
      renderVisual: () => (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
            <div className="border-b border-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-slate-400">
              {t.afterLabel || "After"}
            </div>
            <img src="/samples/sample-video-after-demo.frame1.jpg" alt="" className="h-36 w-full object-cover" draggable={false} />
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-200">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200">
              <Sparkles size={12} />
              {lang === "tr" ? "Çıktı Önizleme" : "Output Preview"}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {lang === "tr"
                ? "Hata olursa kullanıcı dostu sebep + çözüm önerisi gösterilir."
                : "When errors happen, user-friendly reason + action hint is shown."}
            </p>
          </div>
        </div>
      )
    }
  ]), [lang, t.afterLabel, t.beforeLabel]);

  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const current = slides[index];
  const StepIcon = current.icon;
  const isLast = index === slides.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose?.();
          }
        }}
      >
        <motion.div
          className="w-full max-w-3xl rounded-3xl border border-sky-300/25 bg-gradient-to-br from-slate-900/95 to-slate-950/95 p-5 shadow-[0_38px_90px_rgba(2,6,23,.75)]"
          initial={{ y: 24, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/30 bg-sky-500/10 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-sky-200">
                <Sparkles size={12} />
                {lang === "tr" ? "Hızlı Tur" : "Quick Tour"}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {lang === "tr"
                  ? "En basit akış: yükle -> seç -> işle."
                  : "Simplest flow: upload -> choose -> run."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              aria-label={t.close}
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-200">
            <StepIcon size={14} className="text-sky-300" />
            {current.title}
          </div>
          <p className="mb-4 text-sm text-slate-300">{current.desc}</p>

          {current.renderVisual()}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition ${i === index ? "w-8 bg-sky-300" : "w-4 bg-slate-700 hover:bg-slate-500"}`}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isLast && (
                <button
                  type="button"
                  onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                  className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500"
                >
                  {lang === "tr" ? "Geri" : "Back"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isLast) {
                    onClose?.();
                    return;
                  }
                  setIndex((prev) => Math.min(slides.length - 1, prev + 1));
                }}
                className="cursor-pointer rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                {isLast ? (lang === "tr" ? "Tamam, başlayalım" : "Done, let's start") : (t.guideNext || (lang === "tr" ? "İleri" : "Next"))}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
