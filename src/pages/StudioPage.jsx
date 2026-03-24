import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  FolderKanban,
  Gem,
  History as HistoryIcon,
  Image as ImageIcon,
  Info,
  MessageSquareText,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  UploadCloud,
  UserRound,
  Video,
  Wand,
  X,
  Zap
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { api, toFormData } from "../lib/api";
import { useI18n } from "../i18n";
import MaskPainter from "../components/MaskPainter";
import Tooltip from "../components/Tooltip";
import VideoClipTimeline from "../components/VideoClipTimeline";
import StudioFirstRunModal from "../components/StudioFirstRunModal";

const MAX_VIDEO_SIZE_MB = 120;
const MAX_VIDEO_UPLOAD_SECONDS = 120;
const MAX_VIDEO_CLIP_SECONDS = 18;
const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"]);
const ALLOWED_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const ALLOWED_VIDEO_EXT = [".mp4", ".webm", ".mov", ".mkv"];

export default function StudioPage({ user, tokenBalance, setTokenBalance, onLogout, booting = false }) {
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
  const [brushPanelOpen, setBrushPanelOpen] = useState(false);
  const [masks, setMasks] = useState({ keepMaskDataUrl: "", eraseMaskDataUrl: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [statusHint, setStatusHint] = useState("");
  const [statusTone, setStatusTone] = useState("info");
  const [statusCategory, setStatusCategory] = useState("");
  const [progressPercent, setProgressPercent] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [resultPreviewUrl, setResultPreviewUrl] = useState("");
  const [resultPreviewType, setResultPreviewType] = useState("");
  const [resultOutputName, setResultOutputName] = useState("");
  const [activeJobId, setActiveJobId] = useState(null);
  const [history, setHistory] = useState([]);
  const [myMedia, setMyMedia] = useState([]);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [billingPlans, setBillingPlans] = useState([]);
  const [tokenCosts, setTokenCosts] = useState({ balanced: 1, ultra: 2 });
  const [defaultUserTokens, setDefaultUserTokens] = useState(5);
  const [videoDurationSec, setVideoDurationSec] = useState(0);
  const [clipStartSec, setClipStartSec] = useState(0);
  const [clipEndSec, setClipEndSec] = useState(0);
  const [guidanceMode, setGuidanceMode] = useState("auto");
  const [subjectHintText, setSubjectHintText] = useState("");
  const [studioGuideOpen, setStudioGuideOpen] = useState(false);
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
    if (!user) {
      return;
    }
    const seen = localStorage.getItem("backdroply_studio_onboarding_seen_v1");
    if (!seen) {
      setStudioGuideOpen(true);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (resultPreviewUrl) {
        URL.revokeObjectURL(resultPreviewUrl);
      }
    };
  }, [resultPreviewUrl]);

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
  const studioTabLabelProcess = t.studioNavProcess || (lang === "tr" ? "Editör" : "Editor");
  const studioTabLabelHistory = t.studioNavHistory || (lang === "tr" ? "Geçmiş" : "History");
  const studioTabLabelMedia = t.studioNavMedia || t.myMedia || (lang === "tr" ? "Medyalarım" : "My Media");
  const studioTabLabelAccount = t.studioNavAccount || (lang === "tr" ? "Hesap" : "Account");
  const studioTabs = useMemo(() => ([
    { key: "process", to: "/studio", label: studioTabLabelProcess, end: true, icon: Wand },
    { key: "history", to: "/studio/history", label: studioTabLabelHistory, icon: HistoryIcon },
    { key: "media", to: "/studio/media", label: studioTabLabelMedia, icon: FolderKanban },
    { key: "account", to: "/studio/account", label: studioTabLabelAccount, icon: UserRound }
  ]), [studioTabLabelAccount, studioTabLabelHistory, studioTabLabelMedia, studioTabLabelProcess]);
  const uploadedPreviewType = useMemo(() => {
    if (!file) {
      return "";
    }
    const mime = String(file.type || "").toLowerCase();
    if (mime.startsWith("video/")) {
      return "video";
    }
    if (mime.startsWith("image/")) {
      return "image";
    }
    return mediaType;
  }, [file, mediaType]);
  const outputPreviewTitle = lang === "tr" ? "Çıktı Önizleme" : "Output Preview";
  const outputPreviewHint = lang === "tr"
    ? "İndirmeden önce sonucu burada kontrol edebilirsin."
    : "Review your result here before downloading.";
  const inputPreviewTitle = lang === "tr" ? "Yüklenen Medya Önizleme" : "Uploaded Media Preview";

  function closeUpsell() {
    setUpsellOpen(false);
  }

  function closeStudioGuide() {
    localStorage.setItem("backdroply_studio_onboarding_seen_v1", "1");
    setStudioGuideOpen(false);
  }

  function setStatusMessage(message, options = {}) {
    const tone = options.tone || "info";
    const hint = options.hint || "";
    const category = options.category || "";
    setStatus(message || "");
    setStatusHint(hint);
    setStatusTone(tone);
    setStatusCategory(category);
  }

  function clearResultPreview() {
    if (resultPreviewUrl) {
      URL.revokeObjectURL(resultPreviewUrl);
    }
    setResultPreviewUrl("");
    setResultPreviewType("");
    setResultOutputName("");
  }

  function filenameFromHeaders(headers, fallbackName) {
    const contentDisposition = headers?.["content-disposition"] || "";
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }
    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (plainMatch?.[1]) {
      return plainMatch[1];
    }
    return fallbackName;
  }

  function applyProgress(nextValue, force = false) {
    const parsed = Number(nextValue);
    const safe = Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : null;
    if (safe == null) {
      return;
    }
    setProgressPercent((prev) => {
      if (force || prev == null) {
        return safe;
      }
      return Math.max(prev, safe);
    });
  }

  function fileExtension(filename) {
    const value = String(filename || "").toLowerCase();
    const index = value.lastIndexOf(".");
    return index >= 0 ? value.slice(index) : "";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatSeconds(value) {
    const sec = Number.isFinite(value) ? Math.max(0, value) : 0;
    return sec.toFixed(sec >= 10 ? 1 : 2);
  }

  const maxSelectableVideoSec = useMemo(
    () => Math.max(0, Math.min(videoDurationSec || 0, MAX_VIDEO_UPLOAD_SECONDS)),
    [videoDurationSec]
  );

  function onClipRangeChange(nextStartRaw, nextEndRaw) {
    const maxRange = Math.max(0, maxSelectableVideoSec);
    const start = clamp(Number(nextStartRaw) || 0, 0, maxRange);
    let end = clamp(Number(nextEndRaw) || 0, 0, maxRange);
    if (end <= start) {
      end = Math.min(maxRange, start + 0.1);
    }
    if (end - start > MAX_VIDEO_CLIP_SECONDS) {
      end = Math.min(maxRange, start + MAX_VIDEO_CLIP_SECONDS);
    }
    setClipStartSec(start);
    setClipEndSec(end);
  }

  function onClipStartChange(nextStartRaw) {
    onClipRangeChange(nextStartRaw, clipEndSec);
  }

  function onClipEndChange(nextEndRaw) {
    onClipRangeChange(clipStartSec, nextEndRaw);
  }

  function isAllowedImageFile(nextFile) {
    const mime = String(nextFile?.type || "").toLowerCase();
    const ext = fileExtension(nextFile?.name);
    return ALLOWED_IMAGE_MIME.has(mime) || ALLOWED_IMAGE_EXT.includes(ext);
  }

  function isAllowedVideoFile(nextFile) {
    const mime = String(nextFile?.type || "").toLowerCase();
    const ext = fileExtension(nextFile?.name);
    return ALLOWED_VIDEO_MIME.has(mime) || ALLOWED_VIDEO_EXT.includes(ext);
  }

  function showUploadError(message, hint = "") {
    setStatusMessage(message, { tone: "error", hint, category: "upload" });
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message);
    }
  }

  function normalizeApiErrorLegacy(err, fallback) {
    const data = err?.response?.data;
    const raw = String(
      (typeof data === "string" ? data : (data?.error || data?.detail || data?.message || "")) || ""
    ).trim();
    const lower = raw.toLowerCase();
    if (lower.includes("unsupported image content type")) {
      return t.unsupportedImageContentType || fallback;
    }
    if (lower.includes("unsupported video content type")) {
      return t.unsupportedVideoContentType || fallback;
    }
    if (lower.includes("image signature is invalid") || lower.includes("video signature is invalid")) {
      return t.unsupportedFileType || fallback;
    }
    if (lower.includes("video processing worker exited unexpectedly")) {
      return lang === "tr"
        ? "Video işleme sırasında altyapı hatası oluştu. Tekrar dene veya kaliteyi Balanced seç."
        : "Infrastructure error during video processing. Retry or switch quality to Balanced.";
    }
    return raw || fallback;
  }

  async function loadOutputPreview(targetDownloadUrl, mediaTypeHint) {
    if (!targetDownloadUrl) {
      return;
    }
    try {
      const res = await api.get(targetDownloadUrl.replace("/api/v1", ""), { responseType: "blob" });
      const fallbackName = mediaTypeHint === "video" ? "backdroply-output.webm" : "backdroply-output.png";
      const filename = filenameFromHeaders(res.headers, fallbackName);
      const mime = String(res.headers?.["content-type"] || res.data?.type || "").toLowerCase();
      const lowerName = filename.toLowerCase();
      const type = mime.startsWith("video/") || lowerName.endsWith(".webm") || lowerName.endsWith(".mp4")
        ? "video"
        : "image";
      const nextUrl = URL.createObjectURL(res.data);
      if (resultPreviewUrl) {
        URL.revokeObjectURL(resultPreviewUrl);
      }
      setResultPreviewUrl(nextUrl);
      setResultPreviewType(type);
      setResultOutputName(filename);
    } catch {
      const fallback = lang === "tr" ? "Önizleme yüklenemedi, yalnızca indirme kullanılabilir." : "Preview could not be loaded; download is still available.";
      setStatusMessage(status ? `${status} | ${fallback}` : fallback, { tone: "warning", category: "general" });
    }
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
    setStatusMessage("");
    setProgressPercent(null);
    setDownloadUrl("");
    clearResultPreview();
    setBrushImage("");
    setBrushPanelOpen(false);
    setMasks({ keepMaskDataUrl: "", eraseMaskDataUrl: "" });
    setVideoDurationSec(0);
    setClipStartSec(0);
    setClipEndSec(0);
    if (!nextFile) {
      setFile(null);
      setPreviewUrl("");
      return;
    }
    const detectedMediaType = detectMediaType(nextFile);
    if (!detectedMediaType) {
      setFile(null);
      setPreviewUrl("");
      showUploadError(t.unsupportedFileType || t.processFailed);
      return;
    }
    if (detectedMediaType === "image" && !isAllowedImageFile(nextFile)) {
      setFile(null);
      setPreviewUrl("");
      showUploadError(t.unsupportedImageContentType || t.processFailed);
      return;
    }
    if (detectedMediaType === "video" && !isAllowedVideoFile(nextFile)) {
      setFile(null);
      setPreviewUrl("");
      showUploadError(t.unsupportedVideoContentType || t.processFailed);
      return;
    }
    const effectiveMediaType = detectedMediaType;
    if (detectedMediaType && detectedMediaType !== mediaType) {
      setMediaType(detectedMediaType);
    }
    setFile(nextFile);
    const obj = URL.createObjectURL(nextFile);
    setPreviewUrl(obj);
    if (effectiveMediaType === "image") {
      setBrushImage(obj);
      return;
    }
    if (nextFile.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setStatusMessage(t.videoSizeLimit(MAX_VIDEO_SIZE_MB), { tone: "error", category: "limits" });
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
        const duration = Number(v.duration || 0);
        videoMetaRef.current.duration = duration;
        setVideoDurationSec(duration);
        const defaultClipEnd = Math.min(duration, MAX_VIDEO_CLIP_SECONDS);
        setClipStartSec(0);
        setClipEndSec(defaultClipEnd);
        if (duration > MAX_VIDEO_UPLOAD_SECONDS) {
          setStatusMessage(t.videoDurationLimit(MAX_VIDEO_UPLOAD_SECONDS), { tone: "error", hint: t.videoClipTooltip || "", category: "limits" });
          setFile(null);
          setPreviewUrl("");
          setVideoDurationSec(0);
          setClipStartSec(0);
          setClipEndSec(0);
          resolve();
          return;
        }
        if (duration > MAX_VIDEO_CLIP_SECONDS) {
          setStatusMessage(t.videoClipHint(MAX_VIDEO_CLIP_SECONDS), { tone: "warning", hint: t.videoClipTooltip || "", category: "limits" });
        }
        resolve();
      };
      v.onerror = () => {
        setStatusMessage(t.videoMetadataError, { tone: "error", category: "upload" });
        setFile(null);
        setPreviewUrl("");
        setVideoDurationSec(0);
        setClipStartSec(0);
        setClipEndSec(0);
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
      setBrushPanelOpen(true);
      setStatusMessage(t.frameLoaded, { tone: "success", category: "general" });
    } catch (err) {
      const normalized = normalizeApiError(err, t.frameExtractError);
      setStatusMessage(normalized.message, { tone: normalized.tone, hint: normalized.hint, category: normalized.category });
    }
  }

  async function runProcess() {
    if (!canProcess) {
      return;
    }
    if ((tokenBalance ?? 0) < currentTokenCost) {
      setStatusMessage(t.errorNotEnoughTokens || (lang === "tr" ? "Yetersiz token." : "Not enough tokens."), {
        tone: "error",
        hint: t.errorNotEnoughTokensHint || "",
        category: "limits"
      });
      setUpsellOpen(true);
      return;
    }
    if (mediaType === "video") {
      const start = Number(clipStartSec || 0);
      const end = Number(clipEndSec || 0);
      const clipLen = end - start;
      if (!Number.isFinite(start) || !Number.isFinite(end) || clipLen <= 0) {
        setStatusMessage(t.invalidClipRange, { tone: "error", hint: t.videoClipTooltip || "", category: "limits" });
        return;
      }
      if (clipLen > MAX_VIDEO_CLIP_SECONDS + 1e-6) {
        setStatusMessage(t.videoClipLengthLimit(MAX_VIDEO_CLIP_SECONDS), { tone: "error", hint: t.videoClipTooltip || "", category: "limits" });
        return;
      }
    }
    let keepBusy = false;
    setBusy(true);
    setStatusMessage("");
    setProgressPercent(1);
    setDownloadUrl("");
    clearResultPreview();
    try {
      const endpoint = mediaType === "image" ? "/media/image" : "/media/video";
      const fd = toFormData({
        file,
        quality,
        bgColor: bgMode === "transparent" ? "transparent" : bgColor,
        keepMaskDataUrl: masks.keepMaskDataUrl,
        eraseMaskDataUrl: masks.eraseMaskDataUrl,
        guidanceMode,
        subjectHint: (guidanceMode === "text" || guidanceMode === "hybrid") ? subjectHintText : "",
        ...(mediaType === "video"
          ? {
              clipStartSec: Number(clipStartSec || 0).toFixed(3),
              clipEndSec: Number(clipEndSec || 0).toFixed(3)
            }
          : {})
      });
      const res = await api.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setTokenBalance(res.data.tokenBalance);
      const state = String(res.data.status || "").toLowerCase();
      if (state === "success") {
        await applySuccessStatus(res.data);
      } else if (state === "failed") {
        const normalized = normalizeRawError(res.data.errorMessage, t.processFailed);
        setStatusMessage(normalized.message, { tone: normalized.tone, hint: normalized.hint, category: normalized.category });
        setProgressPercent(null);
        setBusy(false);
      } else {
        keepBusy = true;
        setActiveJobId(res.data.jobId);
        applyProgress(res.data.progressPercent);
        const queuePos = Number(res.data.queuePosition || 0);
        const queueText = lang === "tr"
          ? `Kuyrukta (#${queuePos + 1})`
          : `Queued (#${queuePos + 1})`;
        setStatusMessage(queueText, { tone: "info", category: "queue" });
      }
    } catch (err) {
      const statusCode = err?.response?.status;
      const normalized = normalizeApiError(err, t.processFailed);
      setStatusMessage(normalized.message, { tone: normalized.tone, hint: normalized.hint, category: normalized.category });
      setProgressPercent(null);
      const lowToken = statusCode === 402 || String(normalized.message || "").toLowerCase().includes("not enough tokens");
      if (lowToken) {
        setUpsellOpen(true);
      }
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
          const normalized = normalizeRawError(res.data?.errorMessage, t.processFailed);
          setStatusMessage(normalized.message, { tone: normalized.tone, hint: normalized.hint, category: normalized.category });
          setProgressPercent(null);
          setActiveJobId(null);
          setBusy(false);
          return;
        }
        applyProgress(res.data?.progressPercent);
        const queuePos = Number(res.data?.queuePosition || 0);
        if (state === "processing") {
          setStatusMessage(lang === "tr" ? "Isleniyor" : "Processing", { tone: "info", category: "engine" });
          return;
        }
        const queueText = lang === "tr"
          ? `Kuyrukta (#${queuePos + 1})`
          : `Queued (#${queuePos + 1})`;
        setStatusMessage(queueText, { tone: "info", category: "queue" });
      } catch (err) {
        if (cancelled) {
          return;
        }
        const normalized = normalizeApiError(err, t.processFailed);
        setStatusMessage(normalized.message, { tone: normalized.tone, hint: normalized.hint, category: normalized.category });
        setProgressPercent(null);
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
    setStatusMessage(`${t.completedStatus(payload.qcSuspectFrames ?? 0, storedNote)} | ${spendNote} | ${wmNote}`, {
      tone: "success",
      category: "general"
    });
    applyProgress(100, true);
    const nextDownloadUrl = payload.downloadUrl || "";
    setDownloadUrl(nextDownloadUrl);
    await loadOutputPreview(nextDownloadUrl, payload.mediaType || mediaType);
    const hist = await api.get("/users/history");
    setHistory(hist.data);
    const mediaRes = await api.get("/media/my-media");
    setMyMedia(mediaRes.data);
  }

  async function buyPack(packCode) {
    setPurchaseBusy(true);
    try {
      await api.post("/billing/purchase-intent", { packCode });
      setStatusMessage(t.buyIntentCreated, { tone: "success", category: "general" });
    } catch (err) {
      const normalized = normalizeApiError(err, t.buyIntentFailed);
      setStatusMessage(normalized.message, { tone: normalized.tone, hint: normalized.hint, category: normalized.category });
    } finally {
      setPurchaseBusy(false);
      setUpsellOpen(false);
    }
  }

  const historyItems = useMemo(() => history || [], [history]);
  const mediaItems = useMemo(() => myMedia || [], [myMedia]);

  async function downloadOutput() {
    if (resultPreviewUrl) {
      const a = document.createElement("a");
      a.href = resultPreviewUrl;
      a.download = resultOutputName || "backdroply-output";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    if (!downloadUrl) {
      return;
    }
    try {
      const res = await api.get(downloadUrl.replace("/api/v1", ""), { responseType: "blob" });
      const filename = filenameFromHeaders(res.headers, "backdroply-output");
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setStatusMessage(t.outputDownloadFailed, { tone: "error", category: "network" });
    }
  }

  async function downloadByJob(jobId) {
    try {
      const res = await api.get(`/media/jobs/${jobId}/download`, { responseType: "blob" });
      const filename = filenameFromHeaders(res.headers, `backdroply-output-${jobId}`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setStatusMessage(t.savedMediaDownloadFailed, { tone: "error", category: "network" });
    }
  }

  async function deleteAccount() {
    const ok = window.confirm(t.accountDeleteConfirm);
    if (!ok) {
      return;
    }
    try {
      await api.delete("/users/me");
      setStatusMessage(t.accountDeleteDone, { tone: "success", category: "general" });
      onLogout?.();
    } catch (err) {
      const normalized = normalizeApiError(err, t.accountDeleteFailed);
      setStatusMessage(normalized.message, { tone: normalized.tone, hint: normalized.hint, category: normalized.category });
    }
  }

  function detectMediaType(nextFile) {
    const mime = String(nextFile?.type || "").toLowerCase();
    if (mime.startsWith("video/")) {
      return "video";
    }
    if (mime.startsWith("image/")) {
      return "image";
    }
    const lowerName = String(nextFile?.name || "").toLowerCase();
    if (/\.(mp4|webm|mov|mkv|avi|m4v)$/.test(lowerName)) {
      return "video";
    }
    if (/\.(png|jpg|jpeg|webp|bmp|gif|tiff|heic|heif)$/.test(lowerName)) {
      return "image";
    }
    return "";
  }

  function errorGroupLabel(category) {
    if (category === "upload") {
      return t.errorGroupUpload || (lang === "tr" ? "Yukleme" : "Upload");
    }
    if (category === "limits") {
      return t.errorGroupLimits || (lang === "tr" ? "Limit" : "Limits");
    }
    if (category === "engine") {
      return t.errorGroupEngine || (lang === "tr" ? "Isleme Motoru" : "Engine");
    }
    if (category === "network") {
      return t.errorGroupNetwork || (lang === "tr" ? "Baglanti" : "Network");
    }
    if (category === "security") {
      return t.errorGroupSecurity || (lang === "tr" ? "Guvenlik" : "Security");
    }
    if (category === "queue") {
      return t.errorGroupQueue || (lang === "tr" ? "Kuyruk" : "Queue");
    }
    return t.errorGroupGeneral || (lang === "tr" ? "Durum" : "Status");
  }

  function classifyErrorByText(statusCode, rawMessage, fallback) {
    const message = String(rawMessage || "").trim();
    const lower = message.toLowerCase();
    if (statusCode === 413 || lower.includes("413 request entity too large")) {
      return {
        tone: "error",
        category: "upload",
        message: t.errorUploadTooLarge || fallback,
        hint: t.errorUploadTooLargeHint || ""
      };
    }
    if (statusCode === 402 || lower.includes("not enough tokens")) {
      return {
        tone: "error",
        category: "limits",
        message: t.errorNotEnoughTokens || fallback,
        hint: t.errorNotEnoughTokensHint || ""
      };
    }
    if (lower.includes("video resolution exceeds limit")) {
      return {
        tone: "error",
        category: "limits",
        message: t.errorVideoResolutionLimit || fallback,
        hint: t.errorVideoResolutionLimitHint || ""
      };
    }
    if (lower.includes("image resolution exceeds limit")) {
      return {
        tone: "error",
        category: "limits",
        message: t.errorImageResolutionLimit || fallback,
        hint: t.errorImageResolutionLimitHint || ""
      };
    }
    if (lower.includes("video processing timed out")) {
      return {
        tone: "error",
        category: "engine",
        message: t.errorVideoTimeout || fallback,
        hint: t.errorVideoTimeoutHint || ""
      };
    }
    if (lower.includes("worker exited unexpectedly")) {
      return {
        tone: "error",
        category: "engine",
        message: t.errorEngineWorker || fallback,
        hint: t.errorEngineWorkerHint || ""
      };
    }
    if (lower.includes("selected clip duration exceeds")) {
      return {
        tone: "error",
        category: "limits",
        message: t.videoClipLengthLimit(MAX_VIDEO_CLIP_SECONDS),
        hint: t.videoClipTooltip || ""
      };
    }
    if (lower.includes("video duration exceeds")) {
      return {
        tone: "error",
        category: "limits",
        message: t.videoDurationLimit(MAX_VIDEO_UPLOAD_SECONDS),
        hint: t.videoClipTooltip || ""
      };
    }
    if (lower.includes("blocked: suspicious script-like payload")) {
      return {
        tone: "error",
        category: "security",
        message: t.errorBlockedPayload || fallback,
        hint: t.errorBlockedPayloadHint || ""
      };
    }
    if (lower.includes("unsupported image content type")) {
      return { tone: "error", category: "upload", message: t.unsupportedImageContentType || fallback, hint: "" };
    }
    if (lower.includes("unsupported video content type")) {
      return { tone: "error", category: "upload", message: t.unsupportedVideoContentType || fallback, hint: "" };
    }
    if (lower.includes("image signature is invalid") || lower.includes("video signature is invalid")) {
      return { tone: "error", category: "upload", message: t.unsupportedFileType || fallback, hint: "" };
    }
    if (lower.includes("network error") || lower.includes("failed to fetch")) {
      return {
        tone: "error",
        category: "network",
        message: t.errorNetworkGeneric || fallback,
        hint: t.errorNetworkGenericHint || ""
      };
    }
    if (lower.includes("queue")) {
      return {
        tone: "warning",
        category: "queue",
        message: message || fallback,
        hint: ""
      };
    }
    return {
      tone: "error",
      category: "general",
      message: message || fallback,
      hint: ""
    };
  }

  function normalizeApiError(err, fallback) {
    const statusCode = Number(err?.response?.status || 0);
    const data = err?.response?.data;
    const raw = String(
      (typeof data === "string" ? data : (data?.error || data?.detail || data?.message || "")) || ""
    ).trim();
    return classifyErrorByText(statusCode, raw, fallback);
  }

  function normalizeRawError(rawMessage, fallback, statusCode = 0) {
    return classifyErrorByText(statusCode, rawMessage, fallback);
  }

  return (
    <main className="relative mx-auto w-full max-w-7xl px-5 py-8">
      <div className="pointer-events-none absolute left-0 top-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-6 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-100">
            <Sparkles size={20} className="text-cyan-300" />
            {t.studioTitle}
          </h1>
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
                  <span className="inline-flex items-center gap-1.5">
                    <tab.icon size={13} />
                    {tab.label}
                  </span>
                </NavLink>
              ))}
            </nav>
          </div>

          {activeStudioView === "process" && (
            <div>
              <motion.section
            id="studio-editor-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-5 shadow-[0_24px_60px_rgba(2,6,23,.58)]"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${mediaType === "video" ? "bg-sky-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}
                onClick={() => {
                  setMediaType("video");
                  setFile(null);
                  setPreviewUrl("");
                  setDownloadUrl("");
                  setProgressPercent(null);
                  setBrushPanelOpen(false);
                  setVideoDurationSec(0);
                  setClipStartSec(0);
                  setClipEndSec(0);
                  clearResultPreview();
                }}
              >
                <Video size={14} />
                {t.mediaVideo}
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${mediaType === "image" ? "bg-sky-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}
                onClick={() => {
                  setMediaType("image");
                  setFile(null);
                  setPreviewUrl("");
                  setDownloadUrl("");
                  setProgressPercent(null);
                  setBrushPanelOpen(false);
                  setVideoDurationSec(0);
                  setClipStartSec(0);
                  setClipEndSec(0);
                  clearResultPreview();
                }}
              >
                <ImageIcon size={14} />
                {t.mediaImage}
              </button>
            </div>

            <label className="mb-4 block cursor-pointer rounded-2xl border border-dashed border-slate-700 bg-slate-900/45 p-4 text-sm text-slate-300 transition hover:border-sky-300/35">
              <div className="mb-2 inline-flex items-center gap-2 text-xs text-slate-300">
                <UploadCloud size={14} className="text-sky-300" />
                {lang === "tr" ? "Dosya yükleme" : "File upload"}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv,.mov"
                className="mb-2 block w-full cursor-pointer text-sm text-slate-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:text-slate-100"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              {t.singleFileOnly}
            </label>
            {previewUrl && !(uploadedPreviewType === "image" && brushPanelOpen) && (
              <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/65 p-3">
                <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-200">
                  {uploadedPreviewType === "video" ? <Video size={13} className="text-sky-300" /> : <ImageIcon size={13} className="text-sky-300" />}
                  {inputPreviewTitle}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
                  {uploadedPreviewType === "video" ? (
                    <video
                      key={previewUrl}
                      src={previewUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-auto max-h-[300px] w-full object-contain"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt={lang === "tr" ? "Yüklenen medya önizleme" : "Uploaded media preview"}
                      className="h-auto max-h-[300px] w-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-sky-300" />
                  {t.quality}
                </span>
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
                <span className="inline-flex items-center gap-1.5">
                  <Palette size={14} className="text-sky-300" />
                  {t.bgMode}
                </span>
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
                <Palette size={14} className="text-sky-300" />
                {t.colorLabel}
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              </label>
            )}

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                <MessageSquareText size={14} className="text-sky-300" />
                {t.subjectGuidanceTitle || (lang === "tr" ? "Nesne Yonlendirme" : "Subject Guidance")}
                <Tooltip text={t.subjectGuidanceTooltip || (lang === "tr"
                  ? "Auto: sistem ana nesneyi otomatik bulur. Brush: Keep/Erase boyama kullan. Metin: neyi korumak istedigini yaz. Hibrit: brush + metin birlikte."
                  : "Auto: system detects main subject. Brush: use Keep/Erase painting. Text: describe what to keep. Hybrid: combine brush + text.")} />
              </div>
              <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setGuidanceMode("auto")}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition ${
                    guidanceMode === "auto"
                      ? "border-sky-300/70 bg-sky-400/15 text-sky-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={13} />
                    {t.subjectGuidanceAuto || (lang === "tr" ? "Otomatik" : "Auto")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuidanceMode("brush")}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition ${
                    guidanceMode === "brush"
                      ? "border-sky-300/70 bg-sky-400/15 text-sky-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Wand size={13} />
                    {t.subjectGuidanceBrush || (lang === "tr" ? "Sadece Brush" : "Brush Only")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuidanceMode("text")}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition ${
                    guidanceMode === "text"
                      ? "border-sky-300/70 bg-sky-400/15 text-sky-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquareText size={13} />
                    {t.subjectGuidanceText || (lang === "tr" ? "Metinle Tarif" : "Text Prompt")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuidanceMode("hybrid")}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition ${
                    guidanceMode === "hybrid"
                      ? "border-sky-300/70 bg-sky-400/15 text-sky-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <TimerReset size={13} />
                    {t.subjectGuidanceHybrid || (lang === "tr" ? "Hibrit" : "Hybrid")}
                  </span>
                </button>
              </div>
              {(guidanceMode === "text" || guidanceMode === "hybrid") && (
                <label className="block text-xs text-slate-300">
                  <span>{t.subjectGuidanceInputLabel || (lang === "tr" ? "Korunacak nesneyi kisaca tarif et" : "Describe the subject you want to keep")}</span>
                  <textarea
                    rows={2}
                    maxLength={220}
                    value={subjectHintText}
                    onChange={(event) => setSubjectHintText(event.target.value)}
                    placeholder={t.subjectGuidancePlaceholder || (lang === "tr"
                      ? "Ornek: ortadaki kisiyi ve laptopu koru"
                      : "Example: keep the person in center and the laptop")}
                    className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-300/60"
                  />
                </label>
              )}
              <div className="mt-2 text-[11px] text-slate-400">
                {t.subjectGuidanceFootnote || (lang === "tr"
                  ? "En iyi sonuc icin: otomatik mod + gerekirse brush duzeltmesi kullan."
                  : "Best result: start in Auto mode and refine with brush only when needed.")}
              </div>
            </div>

            {mediaType === "video" && file && videoDurationSec > 0 && (
              <VideoClipTimeline
                videoUrl={previewUrl}
                durationSec={videoDurationSec}
                maxSelectableSec={maxSelectableVideoSec}
                clipStartSec={clipStartSec}
                clipEndSec={clipEndSec}
                onStartChange={onClipStartChange}
                onEndChange={onClipEndChange}
                onRangeChange={onClipRangeChange}
                maxClipSeconds={MAX_VIDEO_CLIP_SECONDS}
                labels={{
                  title: t.videoClipRange,
                  tooltip: t.videoClipTooltip,
                  sourceDuration: t.videoSourceDuration(formatSeconds(videoDurationSec)),
                  selectedDuration: t.videoSelectedClip(formatSeconds(Math.max(0, clipEndSec - clipStartSec))),
                  start: t.videoClipStart,
                  end: t.videoClipEnd,
                  quickPresets: t.videoClipQuickPresets || (lang === "tr" ? "Hizli secim" : "Quick presets"),
                  presetMax: t.videoClipPresetMax || (lang === "tr" ? "Maksimum" : "Maximum")
                }}
              />
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
                    max={maxSelectableVideoSec || 0}
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

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
              <button
                type="button"
                onClick={() => setBrushPanelOpen((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-slate-500"
              >
                <span className="inline-flex items-center gap-2">
                  <Wand size={14} className="text-sky-300" />
                  {t.brushPanelTitle || (lang === "tr" ? "Brush düzenleme alanı" : "Brush refinement panel")}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                  {brushPanelOpen
                    ? (t.brushPanelHide || (lang === "tr" ? "Paneli kapat" : "Collapse panel"))
                    : (t.brushPanelShow || (lang === "tr" ? "Paneli aç" : "Open panel"))}
                  {brushPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>
              <p className="mt-2 text-xs text-slate-400">
                {t.brushPanelHint || (lang === "tr"
                  ? "Zor sahnelerde Keep/Erase ile manuel düzeltme için paneli açabilirsin."
                  : "Open this panel when you need manual Keep/Erase corrections on difficult media.")}
              </p>
              {brushPanelOpen && (
                <div className="mt-3">
                  <MaskPainter imageUrl={brushImage} onMasksChange={setMasks} />
                </div>
              )}
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
            {(status || typeof progressPercent === "number") && (
              <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                statusTone === "error"
                  ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                  : statusTone === "success"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                    : statusTone === "warning"
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                      : "border-slate-800 bg-slate-900/60 text-slate-200"
              }`}>
                {status && (
                  <div className="inline-flex items-start gap-2">
                    {statusTone === "error" ? (
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    ) : statusTone === "success" ? (
                      <BadgeCheck size={15} className="mt-0.5 shrink-0" />
                    ) : (
                      <Info size={15} className="mt-0.5 shrink-0" />
                    )}
                    <div>
                      {statusCategory && (
                        <span className="mb-1 inline-flex rounded-full border border-slate-500/40 bg-slate-950/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-slate-200/85">
                          {errorGroupLabel(statusCategory)}
                        </span>
                      )}
                      <div>{status}</div>
                    </div>
                  </div>
                )}
                {statusHint && <div className="mt-1 text-xs opacity-90">{statusHint}</div>}
                {typeof progressPercent === "number" && (
                  <div className="mt-2">
                    <div className="mb-1 text-xs text-sky-200/90">
                      {lang === "tr" ? `Ilerleme: %${progressPercent}` : `Progress: ${progressPercent}%`}
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-[width] duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {resultPreviewUrl && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/65 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                    <Sparkles size={14} className="text-sky-300" />
                    {outputPreviewTitle}
                  </div>
                  {resultOutputName && (
                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
                      {resultOutputName}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-400">{outputPreviewHint}</div>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
                  {resultPreviewType === "video" ? (
                    <video
                      key={resultPreviewUrl}
                      src={resultPreviewUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-auto max-h-[380px] w-full object-contain"
                    />
                  ) : (
                    <img
                      src={resultPreviewUrl}
                      alt={lang === "tr" ? "Çıktı önizleme" : "Output preview"}
                      className="h-auto max-h-[380px] w-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}
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
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-100">
                    <HistoryIcon size={18} className="text-sky-300" />
                    {t.history}
                  </h2>
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
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-100">
                    <FolderKanban size={18} className="text-sky-300" />
                    {t.myMedia}
                  </h2>
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
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-100">
                <UserRound size={18} className="text-sky-300" />
                {studioTabLabelAccount}
              </h2>
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

      <StudioFirstRunModal
        open={studioGuideOpen}
        onClose={closeStudioGuide}
      />

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
            className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-[0_32px_80px_rgba(2,6,23,.7)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-cyan-200">
                  <CreditCard size={12} />
                  {lang === "tr" ? "Plan Onerisi" : "Plan Suggestion"}
                </div>
                <div className="text-lg font-semibold text-slate-100">{t.upsell}</div>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                onClick={closeUpsell}
                aria-label={t.close}
              >
                <X size={14} />
              </button>
            </div>
            <div className="mb-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                <div className="mb-1 inline-flex items-center gap-1.5 text-slate-100"><Zap size={12} /> {lang === "tr" ? "Anlik Aktiflestirme" : "Instant Activation"}</div>
                {lang === "tr" ? "Token yuklenir, akis kesilmeden devam edersin." : "Tokens are added instantly so you can continue."}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                <div className="mb-1 inline-flex items-center gap-1.5 text-slate-100"><Gem size={12} /> {lang === "tr" ? "Pro Cikti Avantaji" : "Pro Output Benefit"}</div>
                {lang === "tr" ? "Planlara gore watermark-free cikti secenegi." : "Watermark-free export option on eligible plans."}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                <div className="mb-1 inline-flex items-center gap-1.5 text-slate-100"><ShieldCheck size={12} /> {lang === "tr" ? "Guvenli Odeme" : "Secure Billing"}</div>
                {lang === "tr" ? "Webhook ve idempotency korumali odeme akis mimarisi." : "Webhook + idempotency protected payment flow architecture."}
              </div>
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
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-left text-sm transition ${
                    plan.popular
                      ? "border-sky-300/60 bg-sky-400/15 shadow-[0_0_28px_rgba(56,189,248,.18)] hover:border-sky-200"
                      : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
                  }`}
                >
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                    <BadgeCheck size={12} />
                    {t.planMonthly}
                  </div>
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
                  className="cursor-pointer rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-3 text-left text-sm transition hover:border-emerald-300/60"
                >
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-emerald-200">
                    <BadgeCheck size={12} />
                    {t.planYearly}
                  </div>
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
                className="cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
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
