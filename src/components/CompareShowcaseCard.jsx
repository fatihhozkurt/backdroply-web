import { ArrowLeftRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export default function CompareShowcaseCard({
  title,
  kind,
  beforeSrc,
  afterSrc,
  beforePosterSrc,
  afterPosterSrc,
  beforeLabel,
  afterLabel,
  dragHint
}) {
  const [split, setSplit] = useState(56);
  const [dragging, setDragging] = useState(false);
  const [autoJump, setAutoJump] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [videoFallback, setVideoFallback] = useState({ before: false, after: false });
  const hostRef = useRef(null);
  const beforeVideoRef = useRef(null);
  const afterVideoRef = useRef(null);
  const jumpTimeoutRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (dragging || !isVisible) {
        return;
      }
      setAutoJump(true);
      setSplit((prev) => (prev < 50 ? 82 : 18));
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current);
      }
      jumpTimeoutRef.current = setTimeout(() => {
        setAutoJump(false);
        jumpTimeoutRef.current = null;
      }, 460);
    }, 3400);

    return () => {
      clearInterval(id);
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current);
        jumpTimeoutRef.current = null;
      }
    };
  }, [dragging, isVisible]);

  useEffect(() => {
    if (kind !== "video") {
      return undefined;
    }

    const videos = [beforeVideoRef.current, afterVideoRef.current].filter(Boolean);
    videos.forEach((video) => {
      if (isVisible) {
        if (video.paused) {
          void video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    });

    return () => {
      videos.forEach((video) => video.pause());
    };
  }, [isVisible, kind]);

  function updateSplit(clientX) {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const rect = host.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(clamp(pct, 5, 95));
  }

  function renderMedia(src, isBefore) {
    if (kind === "video") {
      const side = isBefore ? "before" : "after";
      const poster = isBefore ? beforePosterSrc : afterPosterSrc;

      if (videoFallback[side] && poster) {
        return (
          <img
            src={poster}
            alt={title}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className={`pointer-events-none h-full w-full select-none object-cover ${isBefore ? "grayscale contrast-125 brightness-75" : ""}`}
          />
        );
      }

      return (
        <video
          ref={isBefore ? beforeVideoRef : afterVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={poster}
          draggable={false}
          onLoadedData={(e) => {
            setVideoFallback((prev) => ({ ...prev, [side]: false }));
            const mediaEl = e.currentTarget;
            if (isVisible && mediaEl.paused) {
              void mediaEl.play().catch(() => {});
            }
          }}
          onError={() => setVideoFallback((prev) => ({ ...prev, [side]: true }))}
          onDragStart={(e) => e.preventDefault()}
          className={`pointer-events-none h-full w-full select-none object-cover ${isBefore ? "grayscale contrast-125 brightness-75" : ""}`}
        >
          <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
        </video>
      );
    }
    return (
      <img
        src={src}
        alt={title}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className={`pointer-events-none h-full w-full select-none object-cover ${isBefore ? "contrast-110 saturate-90 brightness-95" : ""}`}
      />
    );
  }

  const clipTransition = dragging ? "none" : autoJump ? "clip-path 420ms cubic-bezier(0.18, 0.82, 0.24, 1)" : "none";
  const leftTransition = dragging ? "none" : autoJump ? "left 420ms cubic-bezier(0.18, 0.82, 0.24, 1)" : "none";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-100">{title}</div>
      <div
        ref={hostRef}
        className="group relative aspect-video cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 transition-transform duration-300 hover:scale-[1.005]"
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.preventDefault();
          if (e.pointerType === "mouse") {
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          setDragging(true);
          setAutoJump(false);
          updateSplit(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!dragging) {
            return;
          }
          updateSplit(e.clientX);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        {renderMedia(afterSrc, false)}

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            clipPath: `polygon(0 0, ${split}% 0, ${split}% 100%, 0 100%)`,
            transition: clipTransition
          }}
        >
          {renderMedia(beforeSrc, true)}
        </div>

        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-slate-700 bg-slate-900/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          {beforeLabel}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-sky-300/30 bg-sky-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
          {afterLabel}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/85 px-2 py-1 text-[10px] text-slate-300">
          {dragHint}
        </div>

        <div
          className="pointer-events-none absolute bottom-0 top-0 w-px bg-white/75"
          style={{ left: `calc(${split}% - 0.5px)`, transition: leftTransition }}
        />
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full border border-slate-500 bg-slate-900/95 p-1 text-slate-200 shadow-[0_0_18px_rgba(56,189,248,.25)]"
          style={{ left: `calc(${split}% - 13px)`, transition: leftTransition }}
        >
          <ArrowLeftRight size={14} />
        </div>
      </div>
    </div>
  );
}
