import { useEffect, useMemo, useState } from "react";
import { Film, Scissors } from "lucide-react";
import Tooltip from "./Tooltip";

const THUMB_COUNT = 9;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(value) {
  const sec = Number.isFinite(value) ? Math.max(0, value) : 0;
  return sec.toFixed(sec >= 10 ? 1 : 2);
}

function safePercent(value, max) {
  if (!max || max <= 0) {
    return 0;
  }
  return clamp((value / max) * 100, 0, 100);
}

async function waitFor(eventTarget, eventName) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      eventTarget.removeEventListener(eventName, onOk);
      eventTarget.removeEventListener("error", onError);
    };
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Video event failed: ${eventName}`));
    };
    eventTarget.addEventListener(eventName, onOk, { once: true });
    eventTarget.addEventListener("error", onError, { once: true });
  });
}

async function seekTo(videoEl, sec) {
  const target = clamp(sec, 0, Math.max(0, (videoEl.duration || 0) - 0.05));
  if (Math.abs((videoEl.currentTime || 0) - target) < 0.03) {
    return;
  }
  videoEl.currentTime = target;
  await waitFor(videoEl, "seeked");
}

export default function VideoClipTimeline({
  videoUrl,
  durationSec,
  maxSelectableSec,
  clipStartSec,
  clipEndSec,
  onStartChange,
  onEndChange,
  onRangeChange,
  maxClipSeconds,
  labels
}) {
  const [thumbs, setThumbs] = useState([]);
  const maxRange = Math.max(0, Number(maxSelectableSec || 0));
  const startPct = safePercent(clipStartSec, maxRange);
  const endPct = safePercent(clipEndSec, maxRange);
  const selectedWidth = Math.max(0, endPct - startPct);
  const selectedSec = Math.max(0, Number(clipEndSec || 0) - Number(clipStartSec || 0));

  useEffect(() => {
    let cancelled = false;
    if (!videoUrl || !maxRange) {
      setThumbs([]);
      return () => {
        cancelled = true;
      };
    }

    async function buildThumbnails() {
      try {
        const video = document.createElement("video");
        video.src = videoUrl;
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        await waitFor(video, "loadedmetadata");
        const safeDuration = Math.max(0.2, Math.min(maxRange, Number(video.duration || maxRange)));
        const points = Array.from({ length: THUMB_COUNT }, (_, i) => {
          if (THUMB_COUNT <= 1) {
            return 0;
          }
          return (i / (THUMB_COUNT - 1)) * safeDuration;
        });
        const frameW = 176;
        const ratio = Math.max(0.25, (video.videoHeight || 1) / Math.max(1, video.videoWidth || 1));
        const frameH = Math.max(90, Math.round(frameW * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext("2d");
        const next = [];
        for (const point of points) {
          if (cancelled) {
            return;
          }
          await seekTo(video, point);
          ctx.clearRect(0, 0, frameW, frameH);
          ctx.drawImage(video, 0, 0, frameW, frameH);
          next.push(canvas.toDataURL("image/jpeg", 0.7));
        }
        if (!cancelled) {
          setThumbs(next);
        }
      } catch {
        if (!cancelled) {
          setThumbs([]);
        }
      }
    }

    void buildThumbnails();
    return () => {
      cancelled = true;
    };
  }, [videoUrl, maxRange]);

  const presetValues = useMemo(() => {
    const safeMax = Math.max(0, maxRange);
    return [3, 5, 10]
      .filter((sec) => sec <= safeMax)
      .map((sec) => ({ label: `${sec}s`, value: sec }));
  }, [maxRange]);

  function applyPreset(seconds) {
    const safeSeconds = clamp(Number(seconds || 0), 0.1, Math.max(0.1, maxRange));
    const safeStart = clamp(Number(clipStartSec || 0), 0, Math.max(0, maxRange - 0.1));
    const end = clamp(safeStart + safeSeconds, safeStart + 0.1, maxRange);
    onRangeChange?.(safeStart, end);
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <Scissors size={14} className="text-sky-300" />
        <span>{labels?.title || "Video Clip Range"}</span>
        <Tooltip text={labels?.tooltip || ""} />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5">
          <Film size={11} />
          {labels?.sourceDuration || `Source duration: ${formatSeconds(durationSec)}s`}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-sky-100">
          {labels?.selectedDuration || `Selected clip: ${formatSeconds(selectedSec)}s`}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9">
          {(thumbs.length ? thumbs : Array.from({ length: THUMB_COUNT }, () => "")).map((thumb, index) => (
            <div key={index} className="h-20 border-r border-slate-800/50 bg-slate-900/80 sm:h-24">
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-slate-800/70" />
              )}
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-slate-950/70"
          style={{ width: `${startPct}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-slate-950/70"
          style={{ width: `${Math.max(0, 100 - endPct)}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 border-x border-sky-300/80 bg-sky-400/10 shadow-[0_0_24px_rgba(56,189,248,.25)]"
          style={{ left: `${startPct}%`, width: `${selectedWidth}%` }}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-300">
          <span>{labels?.start || "Start (sec)"}</span>
          <input
            type="range"
            min="0"
            max={maxRange || 0}
            step="0.1"
            value={Math.min(clipStartSec, maxRange || 0)}
            onChange={(event) => onStartChange?.(event.target.value)}
            className="mt-1 w-full cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max={maxRange || 0}
            step="0.1"
            value={Number(clipStartSec || 0).toFixed(1)}
            onChange={(event) => onStartChange?.(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-slate-300">
          <span>{labels?.end || "End (sec)"}</span>
          <input
            type="range"
            min="0"
            max={maxRange || 0}
            step="0.1"
            value={Math.min(clipEndSec, maxRange || 0)}
            onChange={(event) => onEndChange?.(event.target.value)}
            className="mt-1 w-full cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max={maxRange || 0}
            step="0.1"
            value={Number(clipEndSec || 0).toFixed(1)}
            onChange={(event) => onEndChange?.(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-400">{labels?.quickPresets || "Quick presets"}</span>
        {presetValues.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => applyPreset(preset.value)}
            className="cursor-pointer rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-slate-500"
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyPreset(maxClipSeconds)}
          className="cursor-pointer rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-100 transition hover:border-sky-300/60"
        >
          {labels?.presetMax || "Maximum"} ({Math.min(maxRange, maxClipSeconds)}s)
        </button>
      </div>
    </div>
  );
}
