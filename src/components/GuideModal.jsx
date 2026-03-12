import { AnimatePresence, motion } from "framer-motion";
import { Brush, Download, SlidersHorizontal, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

export default function GuideModal({ open, onClose }) {
  const { t } = useI18n();
  const slides = [
    { icon: Upload, title: t.guide1Title, desc: t.guide1Desc },
    { icon: SlidersHorizontal, title: t.guide2Title, desc: t.guide2Desc },
    { icon: Brush, title: t.guide3Title, desc: t.guide3Desc },
    { icon: Download, title: t.guide4Title, desc: t.guide4Desc }
  ];
  const [index, setIndex] = useState(0);
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
  const isLast = index === slides.length - 1;
  const StepIcon = slides[index].icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-md"
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
          className="w-full max-w-xl rounded-3xl border border-sky-300/20 bg-gradient-to-br from-slate-900/95 to-slate-950/95 p-6 shadow-[0_35px_90px_rgba(2,6,23,.7)]"
          initial={{ y: 24, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="text-xs uppercase tracking-[0.18em] text-sky-300/80">{t.guideTitle}</div>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              aria-label="Close guide"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mb-4 text-xs text-slate-400">{t.guideSubtitle}</div>
          <div className="mb-4 inline-flex rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-sky-200">
            <StepIcon size={18} />
          </div>
          <div className="mb-2 text-2xl font-semibold text-slate-100">{slides[index].title}</div>
          <p className="mb-6 text-sm text-slate-300">{slides[index].desc}</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-8 rounded-full ${i === index ? "bg-sky-300" : "bg-slate-700"}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              onClick={() => {
                if (isLast) {
                  onClose();
                  return;
                }
                setIndex(index + 1);
              }}
            >
              {isLast ? t.guideStart : t.guideNext}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
