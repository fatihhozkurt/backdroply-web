import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Sparkles, Wand } from "lucide-react";
import { api, toFormData } from "../lib/api";
import { useI18n } from "../i18n";
import MaskPainter from "../components/MaskPainter";
import Tooltip from "../components/Tooltip";

const MAX_VIDEO_SIZE_MB = 120;
const MAX_VIDEO_SECONDS = 18;

export default function StudioPage({ user, setTokenBalance, onLogout, booting = false }) {
  const { t } = useI18n();
  const [mediaType, setMediaType] = useState("video");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [quality, setQuality] = useState("ultra");
  const [bgMode, setBgMode] = useState("transparent");
  const [bgColor, setBgColor] = useState("#0f172a");
  const [frameSec, setFrameSec] = useState(0);
  const [brushImage, setBrushImage] = useState("");
  const [masks, setMasks] = useState({ keepMaskDataUrl: "", eraseMaskDataUrl: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [myMedia, setMyMedia] = useState([]);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const videoMetaRef = useRef({ duration: 0 });

  useEffect(() => {
    if (!user) {
      return;
    }
    api.get("/users/history").then((res) => setHistory(res.data)).catch(() => {});
    api.get("/media/my-media").then((res) => setMyMedia(res.data)).catch(() => setMyMedia([]));
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const canProcess = Boolean(user && file && !busy);

  async function onFileChange(nextFile) {
    setStatus("");
    setDownloadUrl("");
    setBrushImage("");
    setMasks({ keepMaskDataUrl: "", eraseMaskDataUrl: "" });
    setFile(nextFile);
    if (!nextFile) {
      setPreviewUrl("");
      return;
    }
    const obj = URL.createObjectURL(nextFile);
    setPreviewUrl(obj);
    if (mediaType === "image") {
      setBrushImage(obj);
      return;
    }
    if (nextFile.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setStatus(t.videoSizeLimit(MAX_VIDEO_SIZE_MB));
      setFile(null);
      setPreviewUrl("");
      return;
    }
    await validateVideoDuration(obj);
  }

  async function validateVideoDuration(url) {
    await new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => {
        videoMetaRef.current.duration = v.duration || 0;
        if ((v.duration || 0) > MAX_VIDEO_SECONDS) {
          setStatus(t.videoDurationLimit(MAX_VIDEO_SECONDS));
          setFile(null);
          setPreviewUrl("");
        }
        resolve();
      };
      v.onerror = () => {
        setStatus(t.videoMetadataError);
        setFile(null);
        setPreviewUrl("");
        resolve();
      };
    });
  }

  async function loadVideoFrameForBrush() {
    if (!file || mediaType !== "video") {
      return;
    }
    try {
      const fd = toFormData({ file, timeSec: String(frameSec || 0) });
      const res = await api.post("/media/video/frame", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setBrushImage(res.data.frameDataUrl);
      setStatus(t.frameLoaded);
    } catch (err) {
      setStatus(err?.response?.data?.error || t.frameExtractError);
    }
  }

  async function runProcess() {
    if (!canProcess) {
      return;
    }
    setBusy(true);
    setStatus("");
    setDownloadUrl("");
    try {
      const endpoint = mediaType === "image" ? "/media/image" : "/media/video";
      const fd = toFormData({
        file,
        quality,
        bgColor: bgMode === "transparent" ? "transparent" : bgColor,
        keepMaskDataUrl: masks.keepMaskDataUrl,
        eraseMaskDataUrl: masks.eraseMaskDataUrl
      });
      const res = await api.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setTokenBalance(res.data.tokenBalance);
      const storedNote = res.data.storedInMyMedia ? t.storedInMyMediaNote : "";
      setStatus(t.completedStatus(res.data.qcSuspectFrames ?? 0, storedNote));
      setDownloadUrl(res.data.downloadUrl);
      setUpsellOpen(true);
      const hist = await api.get("/users/history");
      setHistory(hist.data);
      const mediaRes = await api.get("/media/my-media");
      setMyMedia(mediaRes.data);
    } catch (err) {
      setStatus(err?.response?.data?.error || t.processFailed);
    } finally {
      setBusy(false);
    }
  }

  async function buyPack(packCode) {
    setPurchaseBusy(true);
    try {
      await api.post("/billing/purchase-intent", { packCode });
      setStatus(t.buyIntentCreated);
    } catch (err) {
      setStatus(err?.response?.data?.error || t.buyIntentFailed);
    } finally {
      setPurchaseBusy(false);
      setUpsellOpen(false);
    }
  }

  const historyItems = useMemo(() => history || [], [history]);
  const mediaItems = useMemo(() => myMedia || [], [myMedia]);

  async function downloadOutput() {
    if (!downloadUrl) {
      return;
    }
    try {
      const res = await api.get(downloadUrl.replace("/api/v1", ""), { responseType: "blob" });
      const contentDisposition = res.headers["content-disposition"] || "";
      const match = contentDisposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || "backdroply-output";
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setStatus(t.outputDownloadFailed);
    }
  }

  async function downloadByJob(jobId) {
    try {
      const res = await api.get(`/media/jobs/${jobId}/download`, { responseType: "blob" });
      const contentDisposition = res.headers["content-disposition"] || "";
      const match = contentDisposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `backdroply-output-${jobId}`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setStatus(t.savedMediaDownloadFailed);
    }
  }

  async function deleteAccount() {
    const ok = window.confirm(t.accountDeleteConfirm);
    if (!ok) {
      return;
    }
    try {
      await api.delete("/users/me");
      setStatus(t.accountDeleteDone);
      onLogout?.();
    } catch (err) {
      setStatus(err?.response?.data?.error || t.accountDeleteFailed);
    }
  }

  return (
    <main className="relative mx-auto w-full max-w-7xl px-5 py-8">
      <div className="pointer-events-none absolute left-0 top-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-6 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{t.studioTitle}</h1>
          <p className="mt-1 text-xs text-slate-400">{t.privacySecurityDesc}</p>
        </div>
        <div className="text-xs text-slate-400">{t.limits}</div>
      </div>
      {!user ? (
        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200">
          {booting ? t.checkingSession : t.signInRequired}
        </div>
      ) : (
        <div className="relative grid gap-5 lg:grid-cols-[1.45fr,1fr]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-5 shadow-[0_24px_60px_rgba(2,6,23,.58)]"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm ${mediaType === "video" ? "bg-sky-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}
                onClick={() => {
                  setMediaType("video");
                  setFile(null);
                  setPreviewUrl("");
                }}
              >
                {t.mediaVideo}
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm ${mediaType === "image" ? "bg-sky-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}
                onClick={() => {
                  setMediaType("image");
                  setFile(null);
                  setPreviewUrl("");
                }}
              >
                {t.mediaImage}
              </button>
            </div>

            <label className="mb-4 block rounded-2xl border border-dashed border-slate-700 bg-slate-900/45 p-4 text-sm text-slate-300 transition hover:border-sky-300/35">
              <input
                type="file"
                accept={mediaType === "image" ? "image/*" : "video/mp4,video/webm"}
                className="mb-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:text-slate-100"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              {t.singleFileOnly}
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                {t.quality}
                <select
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="balanced">{t.balanced}</option>
                  <option value="ultra">{t.ultra}</option>
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                {t.bgMode}
                <select
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  value={bgMode}
                  onChange={(e) => setBgMode(e.target.value)}
                >
                  <option value="transparent">{t.transparent}</option>
                  <option value="solid">{t.solid}</option>
                </select>
              </label>
            </div>
            {bgMode === "solid" && (
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
                {t.colorLabel}
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              </label>
            )}

            {mediaType === "video" && file && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                  <Wand size={14} />
                  {t.brushPickFrame}
                  <Tooltip text={t.brushTooltip} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={frameSec}
                    onChange={(e) => setFrameSec(Number(e.target.value))}
                    className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={loadVideoFrameForBrush}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700"
                  >
                    {t.extractFrame}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <MaskPainter imageUrl={brushImage} onMasksChange={setMasks} />
            </div>

            <button
              type="button"
              disabled={!canProcess}
              onClick={runProcess}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles size={16} />
              {busy ? t.running : t.process}
            </button>
            {status && <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">{status}</div>}
            {downloadUrl && (
              <button
                type="button"
                onClick={downloadOutput}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
              >
                <Download size={14} />
                {t.downloadResult}
              </button>
            )}
          </motion.section>

          <aside className="space-y-4">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.04 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <h2 className="mb-3 text-sm font-semibold text-slate-100">{t.history}</h2>
              <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                {historyItems.length === 0 ? (
                  <div className="text-xs text-slate-400">{t.historyEmpty}</div>
                ) : (
                  historyItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 text-xs text-slate-300">
                      <div className="font-semibold text-slate-200">
                        {item.mediaType} - {item.quality}
                      </div>
                      <div>{item.inputName}</div>
                      <div>
                        qc: {item.qcSuspectFrames ?? 0} | {item.createdAt}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.section>
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <h2 className="mb-3 text-sm font-semibold text-slate-100">{t.myMedia}</h2>
              <div className="mb-2 text-[11px] text-slate-400">{t.myMediaRetention}</div>
              <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                {mediaItems.length === 0 ? (
                  <div className="text-xs text-slate-400">{t.myMediaEmpty}</div>
                ) : (
                  mediaItems.map((item) => (
                    <div key={item.jobId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 text-xs text-slate-300">
                      <div className="font-semibold text-slate-200">{item.outputName}</div>
                      <div>
                        {item.mediaType} | {item.createdAt}
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadByJob(item.jobId)}
                        className="mt-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-100"
                      >
                        {t.downloadResult}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.section>
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.12 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-300"
            >
              <div className="mb-2 font-semibold text-slate-100">{t.privacySecurityTitle}</div>
              <p>{t.privacySecurityDesc}</p>
              <button
                type="button"
                className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200"
                onClick={deleteAccount}
              >
                {t.deleteAccount}
              </button>
            </motion.section>
          </aside>
        </div>
      )}

      {upsellOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="mb-2 text-lg font-semibold text-slate-100">{t.upsell}</div>
            <div className="mb-4 text-xs text-slate-400">{t.paymentLegalNote}</div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={purchaseBusy}
                onClick={() => buyPack("starter_30")}
                className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950"
              >
                30 Token - 89 TRY
              </button>
              <button
                type="button"
                disabled={purchaseBusy}
                onClick={() => buyPack("pro_80")}
                className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
              >
                80 Token - 199 TRY
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
                onClick={() => setUpsellOpen(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
