import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import Tooltip from "./Tooltip";

export default function MaskPainter({ imageUrl, onMasksChange }) {
  const { t, lang } = useI18n();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const keepMaskRef = useRef(null);
  const eraseMaskRef = useRef(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [mode, setMode] = useState("keep");
  const [brush, setBrush] = useState(22);
  const MAX_HISTORY_STEPS = 40;
  const keepHelp = lang === "tr"
    ? "Keep: Korumak istedigin bolgeleri yesil olarak boya."
    : "Keep: Paint areas you want to preserve.";
  const eraseHelp = lang === "tr"
    ? "Erase: Silmek istedigin bolgeleri kirmizi olarak boya."
    : "Erase: Paint areas you want to remove.";
  const brushHelp = lang === "tr"
    ? "Brush: Firca boyutunu azaltip artirir."
    : "Brush: Controls brush size.";
  const clearHelp = lang === "tr"
    ? "Clear: Cizdigin tum maskeleri temizler."
    : "Clear: Removes all current mask strokes.";
  const undoHelp = lang === "tr"
    ? "Undo: Son firca adimini geri alir (Ctrl+Z)."
    : "Undo: Reverts the last brush action (Ctrl+Z).";

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) {
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const maxWidth = 620;
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      keepMaskRef.current = document.createElement("canvas");
      keepMaskRef.current.width = img.width;
      keepMaskRef.current.height = img.height;
      eraseMaskRef.current = document.createElement("canvas");
      eraseMaskRef.current.width = img.width;
      eraseMaskRef.current.height = img.height;
      historyRef.current = [];
      historyIndexRef.current = -1;
      pushHistorySnapshot();
      publishMasks();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isUndo = event.key?.toLowerCase() === "z" && (event.ctrlKey || event.metaKey);
      if (!isUndo) {
        return;
      }
      event.preventDefault();
      undoLastStroke();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function publishMasks() {
    const keep = keepMaskRef.current?.toDataURL("image/png") || "";
    const erase = eraseMaskRef.current?.toDataURL("image/png") || "";
    onMasksChange?.({ keepMaskDataUrl: keep, eraseMaskDataUrl: erase });
  }

  function drawPoint(clientX, clientY) {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const sx = image.width / canvas.width;
    const sy = image.height / canvas.height;
    const srcX = Math.round(x * sx);
    const srcY = Math.round(y * sy);

    const target = mode === "keep" ? keepMaskRef.current : eraseMaskRef.current;
    const mctx = target.getContext("2d");
    mctx.fillStyle = "#ffffff";
    mctx.beginPath();
    mctx.arc(srcX, srcY, brush * sx, 0, Math.PI * 2);
    mctx.fill();

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawOverlay(ctx, canvas.width / image.width, canvas.height / image.height);
  }

  function drawOverlay(ctx, scaleX, scaleY) {
    const drawMask = (maskCanvas, color) => {
      if (!maskCanvas) {
        return;
      }
      const tmp = document.createElement("canvas");
      tmp.width = maskCanvas.width;
      tmp.height = maskCanvas.height;
      const tctx = tmp.getContext("2d");
      tctx.drawImage(maskCanvas, 0, 0);
      tctx.globalCompositeOperation = "source-in";
      tctx.fillStyle = color;
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(tmp, 0, 0, tmp.width * scaleX, tmp.height * scaleY);
    };
    drawMask(keepMaskRef.current, "rgba(34,197,94,0.45)");
    drawMask(eraseMaskRef.current, "rgba(239,68,68,0.45)");
  }

  function captureHistoryState() {
    if (!keepMaskRef.current || !eraseMaskRef.current) {
      return null;
    }
    return {
      keep: keepMaskRef.current.getContext("2d").getImageData(0, 0, keepMaskRef.current.width, keepMaskRef.current.height),
      erase: eraseMaskRef.current.getContext("2d").getImageData(0, 0, eraseMaskRef.current.width, eraseMaskRef.current.height)
    };
  }

  function restoreHistoryState(state) {
    if (!state || !keepMaskRef.current || !eraseMaskRef.current) {
      return;
    }
    keepMaskRef.current.getContext("2d").putImageData(state.keep, 0, 0);
    eraseMaskRef.current.getContext("2d").putImageData(state.erase, 0, 0);
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawOverlay(ctx, canvas.width / image.width, canvas.height / image.height);
  }

  function pushHistorySnapshot() {
    const snapshot = captureHistoryState();
    if (!snapshot) {
      return;
    }
    const branch = historyRef.current.slice(0, historyIndexRef.current + 1);
    branch.push(snapshot);
    while (branch.length > MAX_HISTORY_STEPS) {
      branch.shift();
    }
    historyRef.current = branch;
    historyIndexRef.current = historyRef.current.length - 1;
  }

  function undoLastStroke() {
    if (historyIndexRef.current <= 0) {
      return;
    }
    historyIndexRef.current -= 1;
    restoreHistoryState(historyRef.current[historyIndexRef.current]);
    publishMasks();
  }

  function pointerDown(e) {
    pushHistorySnapshot();
    isDrawingRef.current = true;
    drawPoint(e.clientX, e.clientY);
  }

  function pointerMove(e) {
    if (!isDrawingRef.current) {
      return;
    }
    drawPoint(e.clientX, e.clientY);
  }

  function pointerUp() {
    if (!isDrawingRef.current) {
      return;
    }
    isDrawingRef.current = false;
    publishMasks();
  }

  function clearAll() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !keepMaskRef.current || !eraseMaskRef.current) {
      return;
    }
    pushHistorySnapshot();
    keepMaskRef.current.getContext("2d").clearRect(0, 0, keepMaskRef.current.width, keepMaskRef.current.height);
    eraseMaskRef.current.getContext("2d").clearRect(0, 0, eraseMaskRef.current.width, eraseMaskRef.current.height);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    publishMasks();
  }

  if (!imageUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 p-4 text-xs text-slate-400">
        {t.brushPickFrame}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          className={`cursor-pointer rounded-full px-3 py-1 ${mode === "keep" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}
          onClick={() => setMode("keep")}
        >
          Keep
        </button>
        <Tooltip text={keepHelp} />
        <button
          type="button"
          className={`cursor-pointer rounded-full px-3 py-1 ${mode === "erase" ? "bg-rose-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}
          onClick={() => setMode("erase")}
        >
          Erase
        </button>
        <Tooltip text={eraseHelp} />
        <label className="inline-flex items-center gap-2 text-slate-300">
          Brush
          <input
            type="range"
            min="8"
            max="60"
            value={brush}
            className="cursor-pointer"
            onChange={(e) => setBrush(Number(e.target.value))}
          />
        </label>
        <Tooltip text={brushHelp} />
        <button type="button" className="cursor-pointer rounded-full bg-slate-800 px-3 py-1 text-slate-200" onClick={undoLastStroke}>
          Undo
        </button>
        <Tooltip text={undoHelp} />
        <button type="button" className="cursor-pointer rounded-full bg-slate-800 px-3 py-1 text-slate-200" onClick={clearAll}>
          Clear
        </button>
        <Tooltip text={clearHelp} />
      </div>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          className="h-auto max-h-[420px] w-auto max-w-full cursor-crosshair rounded-xl border border-slate-700 bg-slate-950"
        />
      </div>
    </div>
  );
}
