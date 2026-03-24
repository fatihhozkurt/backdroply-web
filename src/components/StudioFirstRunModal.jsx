import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, Scissors, Sparkles, Wand, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";

export default function StudioFirstRunModal({ open, onClose }) {
  const { t, lang } = useI18n();
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => ([
    {
      key: "auto",
      icon: Sparkles,
      title: t.studioGuideStep1Title || (lang === "tr" ? "1) Dosya yukle ve hedefi sec" : "1) Upload and pick target mode"),
      desc: t.studioGuideStep1Desc || (lang === "tr"
        ? "Auto, Brush, Metin veya Hibrit moddan birini sec. Sistem bu secime gore ana nesneyi korur."
        : "Choose Auto, Brush, Text, or Hybrid mode. The pipeline keeps your main subject accordingly."),
      imageLeft: "/samples/sample-image-before.jpg",
      imageRight: "/samples/sample-image-after.jpg"
    },
    {
      key: "clip",
      icon: Scissors,
      title: t.studioGuideStep2Title || (lang === "tr" ? "2) Video kesitini timeline'dan belirle" : "2) Set clip range on timeline"),
      desc: t.studioGuideStep2Desc || (lang === "tr"
        ? "Baslangic ve bitis saniyesini timeline uzerinden sec. Sadece secili kesit islenir."
        : "Pick start and end seconds on timeline. Only selected segment is processed."),
      imageLeft: "/samples/sample-video-before-demo.frame1.jpg",
      imageRight: "/samples/sample-video-after-demo.frame1.jpg"
    },
    {
      key: "refine",
      icon: Wand,
      title: t.studioGuideStep3Title || (lang === "tr" ? "3) Zor karelerde brush veya metin ekle" : "3) Add brush or text refinements"),
      desc: t.studioGuideStep3Desc || (lang === "tr"
        ? "Kenar hatalarinda Keep/Erase ile duzelt. Gerekirse 'kisiyi ve laptopu koru' gibi metin ver."
        : "Use Keep/Erase for edge fixes, and optionally add text like 'keep the person and laptop'."),
      imageLeft: "/samples/sample-image-before.jpg",
      imageRight: "/samples/sample-image-after.jpg"
    },
    {
      key: "done",
      icon: MessageSquareText,
      title: t.studioGuideStep4Title || (lang === "tr" ? "4) Sonucu izle, sonra indir" : "4) Preview result, then download"),
      desc: t.studioGuideStep4Desc || (lang === "tr"
        ? "Hata olursa acik mesaj ve cozum onerisi gorursun. Ciktiyi indirirken kalite korunur."
        : "If a failure happens, you get clear reason + suggestion. Download keeps output quality."),
      imageLeft: "/samples/sample-video-before-demo.frame1.jpg",
      imageRight: "/samples/sample-video-after-demo.frame1.jpg"
    }
  ]), [lang, t]);

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
                {t.guideTitle || (lang === "tr" ? "Hizli Tur" : "Quick Tour")}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {t.studioGuideSubtitle || (lang === "tr"
                  ? "Studyoya ilk giris: 4 adimda en iyi sonuca ulas."
                  : "First time in Studio: reach best output in 4 quick steps.")}
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
              <div className="border-b border-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-slate-400">
                {t.beforeLabel || "Before"}
              </div>
              <img src={current.imageLeft} alt="" className="h-40 w-full object-cover sm:h-44" draggable={false} />
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
              <div className="border-b border-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-slate-400">
                {t.afterLabel || "After"}
              </div>
              <img src={current.imageRight} alt="" className="h-40 w-full object-cover sm:h-44" draggable={false} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition ${
                    i === index ? "w-8 bg-sky-300" : "w-4 bg-slate-700 hover:bg-slate-500"
                  }`}
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
                {isLast ? (lang === "tr" ? "Tamam, baslayalim" : "Done, let's start") : (t.guideNext || (lang === "tr" ? "Ileri" : "Next"))}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
