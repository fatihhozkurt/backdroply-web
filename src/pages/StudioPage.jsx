import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Sparkles, Wand, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { api, toFormData } from "../lib/api";
import { useI18n } from "../i18n";
import MaskPainter from "../components/MaskPainter";
import Tooltip from "../components/Tooltip";

const MAX_VIDEO_SIZE_MB = 120;
const MAX_VIDEO_SECONDS = 18;

export default function StudioPage({ user, setTokenBalance, onLogout, booting = false }) {
  const { t, lang } = useI18n();
  const location = useLocation();
  const billingSupportLine = t.billingSupportLine || (lang === "tr" ? "Destek/İade/İptal talepleri için iletişim kanalı aktiftir:" : "Support/refund/cancellation channel is active:");
  const footerContactLabel = t.footerContact || (lang === "tr" ? "İletişim" : "Contact");
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
  const [activeJobId, setActiveJobId] = useState(null);
  const [history, setHistory] = useState([]);
  const [myMedia, setMyMedia] = useState([]);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [billingPlans, setBillingPlans] = useState([]);
  const [tokenCosts, setTokenCosts] = useState({ balanced: 1, ultra: 2 });
  const [defaultUserTokens, setDefaultUserTokens] = useState(5);
  const videoMetaRef = useRef({ duration: 0 });

  useEffect(() => {
    api.get("/billing/catalog")
      .then((res) => {
        setBillingPlans(Array.isArray(res.data?.plans) ? res.data.plans : []);
        setTokenCosts({
          balanced: Number(res.data?.tokenCostBalanced || 1),
          ultra: Number(res.data?.tokenCostUltra || 2)
        });
        setDefaultUserTokens(Number(res.data?.defaultUserTokens || 5));
      })
      .catch(() => {});
  }, []);

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
  const currentTokenCost = quality === "ultra" ? tokenCosts.ultra : tokenCosts.balanced;
  const monthlyPlans = billingPlans.filter((plan) => Number(plan.durationDays || 0) < 365);
  const yearlyPlans = billingPlans.filter((plan) => Number(plan.durationDays || 0) >= 365);
  const activeStudioView = useMemo(() => {
    const path = location.pathname || "/studio";
    if (path.startsWith("/studio/history")) {
      return "history";
    }
    if (path.startsWith("/studio/media")) {
      return "media";
    }
    if (path.startsWith("/studio/account")) {
      return "account";
    }
    return "process";
  }, [location.pathname]);
  const studioTabLabelProcess = t.studioNavProcess || (lang === "tr" ? "İşlem" : "Process");
  const studioTabLabelHistory = t.studioNavHistory || (lang === "tr" ? "Geçmiş" : "History");
  const studioTabLabelMedia = t.studioNavMedia || t.myMedia || (lang === "tr" ? "Medyalarım" : "My Media");
  const studioTabLabelAccount = t.studioNavAccount || (lang === "tr" ? "Hesap" : "Account");
  const studioWorkspaceHint = t.studioWorkspaceHint || (lang === "tr"
    ? "Odaklı kullanım için stüdyo bölümleri ayrı sekmelere ayrıldı."
    : "Studio modules are split into focused tabs.");
  const studioProcessHint = t.studioProcessHint || (lang === "tr"
    ? "İş akışın hazır olduğunda tek tıkla işlemi başlat."
    : "Start processing with one click once your setup is ready.");
  const studioTabs = useMemo(() => ([
    { key: "process", to: "/studio", label: studioTabLabelProcess, end: true },
    { key: "history", to: "/studio/history", label: studioTabLabelHistory },
    { key: "media", to: "/studio/media", label: studioTabLabelMedia },
    { key: "account", to: "/studio/account", label: studioTabLabelAccount }
  ]), [studioTabLabelAccount, studioTabLabelHistory, studioTabLabelMedia, studioTabLabelProcess]);

  function closeUpsell() {
    setUpsellOpen(false);
  }

  useEffect(() => {
    if (!upsellOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeUpsell();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [upsellOpen]);

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
    let keepBusy = false;
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
      const state = String(res.data.status || "").toLowerCase();
      if (state === "success") {
        await applySuccessStatus(res.data);
      } else if (state === "failed") {
        setStatus(res.data.errorMessage || t.processFailed);
        setBusy(false);
      } else {
        keepBusy = true;
        setActiveJobId(res.data.jobId);
        const eta = Number(res.data.etaSeconds || 0);
        const queuePos = Number(res.data.queuePosition || 0);
        const etaText = eta > 0 ? (lang === "tr" ? `Tahmini ~${eta} sn` : `Estimated ~${eta}s`) : "";
        const queueText = lang === "tr"
          ? `Kuyrukta (#${queuePos + 1})`
          : `Queued (#${queuePos + 1})`;
        setStatus([queueText, etaText].filter(Boolean).join(" | "));
      }
    } catch (err) {
      setStatus(err?.response?.data?.error || t.processFailed);
      setActiveJobId(null);
    } finally {
      if (!keepBusy) {
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    if (!activeJobId || !user) {
      return undefined;
    }
    let cancelled = false;

    async function pollJobStatus() {
      try {
        const res = await api.get(`/media/jobs/${activeJobId}/status`);
        if (cancelled) {
          return;
        }
        if (typeof res.data?.tokenBalance === "number") {
          setTokenBalance(res.data.tokenBalance);
        }
        const state = String(res.data?.status || "").toLowerCase();
        if (state === "success") {
          await applySuccessStatus(res.data);
          setActiveJobId(null);
          setBusy(false);
          return;
        }
        if (state === "failed") {
          setStatus(res.data?.errorMessage || t.processFailed);
          setActiveJobId(null);
          setBusy(false);
          return;
        }
        const eta = Number(res.data?.etaSeconds || 0);
        const queuePos = Number(res.data?.queuePosition || 0);
        if (state === "processing") {
          const etaText = eta > 0 ? (lang === "tr" ? `Tahmini ~${eta} sn` : `Estimated ~${eta}s`) : "";
          setStatus([lang === "tr" ? "İşleniyor" : "Processing", etaText].filter(Boolean).join(" | "));
          return;
        }
        const etaText = eta > 0 ? (lang === "tr" ? `Tahmini ~${eta} sn` : `Estimated ~${eta}s`) : "";
        const queueText = lang === "tr"
          ? `Kuyrukta (#${queuePos + 1})`
          : `Queued (#${queuePos + 1})`;
        setStatus([queueText, etaText].filter(Boolean).join(" | "));
      } catch (err) {
        if (cancelled) {
          return;
        }
        setStatus(err?.response?.data?.error || t.processFailed);
        setActiveJobId(null);
        setBusy(false);
      }
    }

    void pollJobStatus();
    const intervalId = window.setInterval(() => {
      void pollJobStatus();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeJobId, user, lang, t, setTokenBalance]);

  async function applySuccessStatus(payload) {
    const storedNote = payload.storedInMyMedia ? t.storedInMyMediaNote : "";
    const spendNote = t.tokenSpentNote(Number(payload.tokenCostUsed || currentTokenCost));
    const wmNote = payload.watermarkApplied ? t.watermarkAppliedNote : t.watermarkFreeNote;
    setStatus(`${t.completedStatus(payload.qcSuspectFrames ?? 0, storedNote)} | ${spendNote} | ${wmNote}`);
    setDownloadUrl(payload.downloadUrl || "");
    setUpsellOpen(true);
    const hist = await api.get("/users/history");
    setHistory(hist.data);
    const mediaRes = await api.get("/media/my-media");
    setMyMedia(mediaRes.data);
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
        <div className="relative">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap items-center gap-2">
              {studioTabs.map((tab) => (
                <NavLink
                  key={tab.key}
                  to={tab.to}
                  end={Boolean(tab.end)}
                  className={({ isActive }) => `rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "border-sky-300/60 bg-sky-400/15 text-sky-100 shadow-[0_0_22px_rgba(56,189,248,.18)]"
                      : "border-slate-700 bg-slate-900/65 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
            <div className="text-xs text-slate-400">{studioWorkspaceHint}</div>
          </div>

          {activeStudioView === "process" && (
            <div className="grid gap-5 xl:grid-cols-[1.45fr,1fr]">
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
                  <option value="balanced">{`${t.balanced} (${tokenCosts.balanced} token)`}</option>
                  <option value="ultra">{`${t.ultra} (${tokenCosts.ultra} token)`}</option>
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
              {busy ? t.running : `${t.process} - ${currentTokenCost} token`}
            </button>
            {!busy && <div className="mt-2 text-xs text-slate-400">{t.tokenCostHint(currentTokenCost)}</div>}
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
              <h2 className="mb-2 text-sm font-semibold text-slate-100">
                {lang === "tr" ? "Hızlı Erişim" : "Quick Access"}
              </h2>
              <p className="mb-3 text-xs text-slate-400">{studioProcessHint}</p>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <Link to="/studio/history" className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                  {studioTabLabelHistory}
                </Link>
                <Link to="/studio/media" className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                  {studioTabLabelMedia}
                </Link>
                <Link to="/studio/account" className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                  {studioTabLabelAccount}
                </Link>
              </div>
            </motion.section>
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">{t.myMedia}</h2>
                <Link to="/studio/media" className="text-[11px] text-sky-300 transition hover:text-sky-200">
                  {lang === "tr" ? "Tümünü gör" : "View all"}
                </Link>
              </div>
              <div className="mb-2 text-[11px] text-slate-400">{t.myMediaRetention}</div>
              <div className="max-h-[176px] space-y-2 overflow-auto pr-1">
                {mediaItems.length === 0 ? (
                  <div className="text-xs text-slate-400">{t.myMediaEmpty}</div>
                ) : (
                  mediaItems.slice(0, 3).map((item) => (
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
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100">{t.history}</div>
                <Link to="/studio/history" className="text-[11px] text-sky-300 transition hover:text-sky-200">
                  {lang === "tr" ? "Tümünü gör" : "View all"}
                </Link>
              </div>
              <div className="max-h-[142px] space-y-2 overflow-auto pr-1">
                {historyItems.length === 0 ? (
                  <div className="text-xs text-slate-400">{t.historyEmpty}</div>
                ) : (
                  historyItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 text-xs text-slate-300">
                      <div className="font-semibold text-slate-200">
                        {item.mediaType} - {item.quality}
                      </div>
                      <div className="truncate">{item.inputName}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.section>
          </aside>
            </div>
          )}

          {activeStudioView === "history" && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-5 shadow-[0_24px_60px_rgba(2,6,23,.58)]"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{t.history}</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === "tr"
                      ? "İşlenen görevler burada listelenir. Başarılı kayıtları indirebilirsin."
                      : "Processed jobs are listed here. You can download completed outputs."}
                  </p>
                </div>
                <Link to="/studio" className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                  {lang === "tr" ? "Yeni İşlem" : "New Process"}
                </Link>
              </div>
              <div className="space-y-3">
                {historyItems.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">{t.historyEmpty}</div>
                ) : (
                  historyItems.map((item) => {
                    const statusValue = String(item.status || "").toLowerCase();
                    const canDownloadHistory = Boolean(item.jobId) && statusValue === "success";
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/65 p-3 text-sm text-slate-300">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-100">{item.inputName}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.mediaType} - {item.quality} - {item.createdAt}
                            </div>
                          </div>
                          <div className="rounded-full border border-slate-700 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-slate-300">
                            {item.status || "UNKNOWN"}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">qc: {item.qcSuspectFrames ?? 0}</div>
                        {canDownloadHistory && (
                          <button
                            type="button"
                            onClick={() => downloadByJob(item.jobId)}
                            className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200"
                          >
                            <Download size={13} />
                            {t.downloadResult}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.section>
          )}

          {activeStudioView === "media" && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-5 shadow-[0_24px_60px_rgba(2,6,23,.58)]"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{t.myMedia}</h2>
                  <p className="mt-1 text-xs text-slate-400">{t.myMediaRetention}</p>
                </div>
                <Link to="/studio" className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                  {lang === "tr" ? "Yeni İşlem" : "New Process"}
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {mediaItems.length === 0 ? (
                  <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">{t.myMediaEmpty}</div>
                ) : (
                  mediaItems.map((item) => (
                    <div key={item.jobId} className="rounded-2xl border border-slate-800 bg-slate-900/65 p-3 text-sm text-slate-300">
                      <div className="font-semibold text-slate-100">{item.outputName}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {item.mediaType} - {item.createdAt}
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadByJob(item.jobId)}
                        className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 transition hover:border-slate-500"
                      >
                        <Download size={13} />
                        {t.downloadResult}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.section>
          )}

          {activeStudioView === "account" && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-5 shadow-[0_24px_60px_rgba(2,6,23,.58)]"
            >
              <h2 className="text-lg font-semibold text-slate-100">{studioTabLabelAccount}</h2>
              <p className="mt-1 text-xs text-slate-400">{t.privacySecurityDesc}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                  <div className="mb-2 text-sm font-semibold text-slate-100">
                    {lang === "tr" ? "Yasal ve Destek" : "Legal & Support"}
                  </div>
                  <div className="mb-3 text-xs text-slate-400">{billingSupportLine}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <a href={`/legal/privacy.html?lang=${lang}`} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700 px-2 py-1 text-slate-200 transition hover:border-slate-500">
                      {t.footerPrivacy}
                    </a>
                    <a href={`/legal/terms.html?lang=${lang}`} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700 px-2 py-1 text-slate-200 transition hover:border-slate-500">
                      {t.footerTerms}
                    </a>
                    <a href={`/legal/cookies.html?lang=${lang}`} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700 px-2 py-1 text-slate-200 transition hover:border-slate-500">
                      {t.footerCookie}
                    </a>
                    <Link to="/contact" className="rounded-full border border-slate-700 px-2 py-1 text-slate-200 transition hover:border-slate-500">
                      {footerContactLabel}
                    </Link>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                  <div className="mb-2 text-sm font-semibold text-slate-100">{t.privacySecurityTitle}</div>
                  <p className="text-xs text-slate-400">
                    {lang === "tr"
                      ? "Hesabı sildiğinde geçmiş ve medya kayıtları kaldırılır. Aynı Google hesabıyla tekrar giriş yeni bir hesap oluşturur."
                      : "Deleting your account removes history and media records. Signing in again with the same Google account creates a new account."}
                  </p>
                  <button
                    type="button"
                    className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200"
                    onClick={deleteAccount}
                  >
                    {t.deleteAccount}
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </div>
      )}

      {upsellOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeUpsell();
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="text-lg font-semibold text-slate-100">{t.upsell}</div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                onClick={closeUpsell}
                aria-label={t.close}
              >
                <X size={14} />
              </button>
            </div>
            <div className="mb-1 text-xs text-slate-400">{t.paymentLegalNote}</div>
            <div className="mb-4 text-xs text-slate-300">
              {billingSupportLine}{" "}
              <Link to="/contact" className="text-sky-300 underline-offset-2 transition hover:text-sky-200 hover:underline">
                {footerContactLabel}
              </Link>
            </div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{t.planTag}</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {billingPlans.length === 0 && (
                <div className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                  {t.billingCatalogMissing}
                </div>
              )}
              {monthlyPlans.map((plan) => (
                <button
                  key={plan.code}
                  type="button"
                  disabled={purchaseBusy}
                  onClick={() => buyPack(plan.code)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    plan.popular
                      ? "border-sky-300/60 bg-sky-400/10 hover:border-sky-200"
                      : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
                  }`}
                >
                  <div className="font-semibold text-slate-100">{lang === "tr" ? plan.labelTr : plan.labelEn}</div>
                  <div className="mt-1 text-xs text-slate-300">{t.planMonthly} • {plan.tokens} token</div>
                  <div className="mt-1 text-xs text-slate-400">{Number(plan.amountTry).toFixed(2)} TRY</div>
                  {plan.watermarkFree && <div className="mt-2 text-[11px] text-emerald-300">{t.planWatermark}</div>}
                </button>
              ))}
              {yearlyPlans.map((plan) => (
                <button
                  key={plan.code}
                  type="button"
                  disabled={purchaseBusy}
                  onClick={() => buyPack(plan.code)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-3 text-left text-sm transition hover:border-emerald-300/60"
                >
                  <div className="font-semibold text-slate-100">{lang === "tr" ? plan.labelTr : plan.labelEn}</div>
                  <div className="mt-1 text-xs text-slate-300">{t.planYearly} • {plan.tokens} token</div>
                  <div className="mt-1 text-xs text-slate-400">{Number(plan.amountTry).toFixed(2)} TRY</div>
                  {plan.watermarkFree && <div className="mt-2 text-[11px] text-emerald-300">{t.planWatermark}</div>}
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              {t.starterTokensInfo(defaultUserTokens)}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
                onClick={closeUpsell}
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
