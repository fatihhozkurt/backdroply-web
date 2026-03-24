import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Save,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useI18n } from "../i18n";

const EMPTY_SESSION = { authenticated: false, username: "", email: "", expiresAtEpochMs: 0 };

function formatDuration(seconds, lang) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value < 60) {
    return lang === "tr" ? `${value} sn` : `${value}s`;
  }
  const min = Math.floor(value / 60);
  const sec = value % 60;
  return lang === "tr" ? `${min} dk ${sec} sn` : `${min}m ${sec}s`;
}

function formatDate(epochMs, lang) {
  if (!epochMs) {
    return "-";
  }
  return new Date(epochMs).toLocaleString(lang === "tr" ? "tr-TR" : "en-US");
}

function toDraft(settings) {
  const out = {};
  (settings || []).forEach((item) => {
    out[item.key] = item.value ?? "";
  });
  return out;
}

function changed(settings, draft) {
  return (settings || [])
    .filter((item) => String(item.value ?? "") !== String(draft[item.key] ?? ""))
    .map((item) => ({ key: item.key, value: String(draft[item.key] ?? "") }));
}

function hasStrongResetPassword(password) {
  return String(password || "").length >= 10;
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-400">
        <Icon size={14} className="text-cyan-300" />
        {label}
      </div>
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
    </article>
  );
}

function FieldLabel({ text }) {
  return <label className="mb-1 block text-xs font-medium text-slate-300">{text}</label>;
}

export default function AdminAuthPage() {
  const { lang } = useI18n();
  const c = useMemo(() => (lang === "tr" ? {
    title: "Ozel Yonetim Paneli",
    subtitle: "Gercek metrikler, canli ayarlar ve denetim kayitlari",
    back: "Ana sayfaya don",
    disabled: "Bu ortamda admin auth kapali.",
    username: "Kullanici adi",
    password: "Sifre",
    login: "Giris yap",
    loginBusy: "Giris yapiliyor...",
    forgot: "Sifre sifirla",
    code: "Kod",
    newPass: "Yeni sifre",
    sendCode: "Kod gonder",
    reset: "Sifreyi guncelle",
    logout: "Cikis yap",
    refresh: "Yenile",
    session: "Oturum acik",
    invalid: "Islem basarisiz.",
    forgotDone: "Hesap varsa kod e-postaya gonderildi.",
    resetDone: "Sifre guncellendi.",
    save: "Ayarlari kaydet",
    saveBusy: "Kaydediliyor...",
    saved: "Ayarlar kaydedildi.",
    noDiff: "Kaydedilecek degisiklik yok.",
    trend: "Trend (14 gun)",
    settings: "Canli Operasyon Ayarlari",
    settingsHint: "Bu ayarlar backend akislarina anlik uygulanir.",
    audit: "Denetim Kaydi",
    day: "Gun",
    jobs: "Is",
    success: "Basarili",
    failed: "Hata",
    noAudit: "Kayit yok.",
    securityGuide: "Guvenlik Notlari",
    securityGuide1: "Bu panel yalnizca owner operasyonu icindir.",
    securityGuide2: "Sifreni guclu tut ve belirli araliklarla degistir.",
    securityGuide3: "Sifirlama kodu tek kullanimliktir.",
    securityGuide4: "Hatali denemelerde rate-limit devrededir.",
    formLogin: "Giris",
    formForgot: "Kod Isteme",
    formReset: "Kod ile Sifirla",
    usernameHint: "owner",
    passHint: "Sifreni gir",
    codeHint: "E-postadaki kod",
    newPassHint: "En az 10 karakter",
    weakPass: "Sifre gucu dusuk. En az 10 karakter onerilir.",
    changedCount: "Degisen ayar",
    noSettingChange: "Ayar degisikligi yok",
    saveChanges: "Degisiklikleri kaydet",
    refreshDone: "Veriler guncellendi.",
    expiresAt: "Oturum bitis",
    lastRefresh: "Son yenileme",
    settingChanged: "Degisti",
    settingCurrent: "Mevcut",
    loading: "Yukleniyor...",
    panelTag: "/auth",
    authModeTag: "Guvenli owner erisimi"
  } : {
    title: "Private Operations Panel",
    subtitle: "Real metrics, live settings and audit logs",
    back: "Back to home",
    disabled: "Admin auth is disabled in this environment.",
    username: "Username",
    password: "Password",
    login: "Sign in",
    loginBusy: "Signing in...",
    forgot: "Reset password",
    code: "Code",
    newPass: "New password",
    sendCode: "Send code",
    reset: "Update password",
    logout: "Sign out",
    refresh: "Refresh",
    session: "Session active",
    invalid: "Operation failed.",
    forgotDone: "If account exists, code is sent.",
    resetDone: "Password updated.",
    save: "Save settings",
    saveBusy: "Saving...",
    saved: "Settings saved.",
    noDiff: "No settings changed.",
    trend: "Trend (14 days)",
    settings: "Live Runtime Settings",
    settingsHint: "These settings are applied live on backend flows.",
    audit: "Audit Trail",
    day: "Day",
    jobs: "Jobs",
    success: "Success",
    failed: "Failed",
    noAudit: "No audit entries.",
    securityGuide: "Security Notes",
    securityGuide1: "This panel is only for owner operations.",
    securityGuide2: "Keep a strong password and rotate it regularly.",
    securityGuide3: "Reset code is one-time use.",
    securityGuide4: "Rate-limits are active on repeated failures.",
    formLogin: "Sign In",
    formForgot: "Request Code",
    formReset: "Reset with Code",
    usernameHint: "owner",
    passHint: "Enter your password",
    codeHint: "Code from your email",
    newPassHint: "At least 10 characters",
    weakPass: "Password looks weak. At least 10 characters is recommended.",
    changedCount: "Changed setting",
    noSettingChange: "No setting changes",
    saveChanges: "Save changes",
    refreshDone: "Data refreshed.",
    expiresAt: "Session expires",
    lastRefresh: "Last refresh",
    settingChanged: "Changed",
    settingCurrent: "Current",
    loading: "Loading...",
    panelTag: "/auth",
    authModeTag: "Secure owner access"
  }), [lang]);

  const [config, setConfig] = useState({ enabled: false, usernameHint: "" });
  const [session, setSession] = useState(EMPTY_SESSION);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [settings, setSettings] = useState([]);
  const [draftSettings, setDraftSettings] = useState({});
  const [audit, setAudit] = useState([]);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState(0);
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", code: "", newPassword: "" });

  const changedSettings = useMemo(() => changed(settings, draftSettings), [settings, draftSettings]);
  const changedCount = changedSettings.length;
  const canSaveSettings = changedCount > 0 && !saving;
  const canResetPassword = Boolean(form.username.trim() && form.code.trim() && hasStrongResetPassword(form.newPassword));

  async function refreshAll(showRefreshStatus = false) {
    const sessionRes = await api.get("/admin-auth/session");
    const next = sessionRes.data || EMPTY_SESSION;
    setSession(next);
    setLastRefreshAt(Date.now());
    if (!next.authenticated) {
      setOverview(null);
      setTrend([]);
      setSettings([]);
      setDraftSettings({});
      setAudit([]);
      return;
    }
    const [overviewRes, trendRes, settingsRes, auditRes] = await Promise.all([
      api.get("/admin-auth/overview"),
      api.get("/admin-auth/trend", { params: { days: 14 } }),
      api.get("/admin-auth/settings"),
      api.get("/admin-auth/audit", { params: { limit: 80 } })
    ]);
    const settingList = settingsRes?.data?.settings || [];
    setOverview(overviewRes.data || null);
    setTrend(Array.isArray(trendRes.data) ? trendRes.data : []);
    setSettings(settingList);
    setDraftSettings(toDraft(settingList));
    setAudit(Array.isArray(auditRes.data) ? auditRes.data : []);
    if (showRefreshStatus) {
      setStatus(c.refreshDone);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.get("/auth/csrf").catch(() => {});
        const cfg = await api.get("/admin-auth/config");
        if (!alive) {
          return;
        }
        setConfig(cfg.data || { enabled: false, usernameHint: "" });
        await refreshAll();
      } catch {
        if (alive) {
          setError(c.invalid);
        }
      } finally {
        if (alive) {
          setBooting(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [c.invalid]);

  async function doLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api.get("/auth/csrf").catch(() => {});
      await api.post("/admin-auth/login", { username: form.username, password: form.password });
      await refreshAll();
      setForm((prev) => ({ ...prev, password: "" }));
      setMode("login");
    } catch (err) {
      setError(err?.response?.data?.error || c.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function doForgot(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api.get("/auth/csrf").catch(() => {});
      await api.post("/admin-auth/forgot-password", { username: form.username });
      setStatus(c.forgotDone);
      setMode("reset");
    } catch (err) {
      setError(err?.response?.data?.error || c.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function doReset(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api.get("/auth/csrf").catch(() => {});
      await api.post("/admin-auth/reset-password", { username: form.username, code: form.code, newPassword: form.newPassword });
      setStatus(c.resetDone);
      setMode("login");
      setForm((prev) => ({ ...prev, code: "", newPassword: "" }));
    } catch (err) {
      setError(err?.response?.data?.error || c.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api.get("/auth/csrf").catch(() => {});
      await api.post("/admin-auth/logout");
      setSession(EMPTY_SESSION);
      setOverview(null);
      setTrend([]);
      setSettings([]);
      setDraftSettings({});
      setAudit([]);
    } catch (err) {
      setError(err?.response?.data?.error || c.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function doSaveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    const updates = changed(settings, draftSettings);
    if (!updates.length) {
      setStatus(c.noDiff);
      setSaving(false);
      return;
    }
    try {
      await api.get("/auth/csrf").catch(() => {});
      const res = await api.post("/admin-auth/settings", { settings: updates });
      const nextSettings = res?.data?.settings || [];
      setSettings(nextSettings);
      setDraftSettings(toDraft(nextSettings));
      const auditRes = await api.get("/admin-auth/audit", { params: { limit: 80 } });
      setAudit(Array.isArray(auditRes.data) ? auditRes.data : []);
      setStatus(c.saved);
    } catch (err) {
      setError(err?.response?.data?.error || c.invalid);
    } finally {
      setSaving(false);
    }
  }

  if (booting) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        {c.loading}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100">
          <ArrowLeft size={14} />
          {c.back}
        </Link>
      </div>

      <section className="mx-auto mt-4 w-full max-w-7xl rounded-[2rem] border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100">
              <ShieldCheck size={14} />
              {c.panelTag}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-100 md:text-4xl">{c.title}</h1>
            <p className="mt-2 text-sm text-slate-300">{c.subtitle}</p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-slate-300">
            {c.authModeTag}
          </span>
        </div>

        {!config.enabled && (
          <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {c.disabled}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <span className="inline-flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </span>
          </div>
        )}
        {status && (
          <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <span className="inline-flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{status}</span>
            </span>
          </div>
        )}

        {config.enabled && !session.authenticated && (
          <div className="mt-5 grid gap-4 md:grid-cols-[1.25fr_1fr]">
            <form
              onSubmit={mode === "login" ? doLogin : mode === "forgot" ? doForgot : doReset}
              className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <div className="mb-4 inline-flex rounded-xl border border-slate-700 bg-slate-900/70 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${mode === "login" ? "bg-sky-400 text-slate-950" : "text-slate-300 hover:text-slate-100"}`}
                >
                  {c.formLogin}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${mode === "forgot" ? "bg-sky-400 text-slate-950" : "text-slate-300 hover:text-slate-100"}`}
                >
                  {c.formForgot}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${mode === "reset" ? "bg-sky-400 text-slate-950" : "text-slate-300 hover:text-slate-100"}`}
                >
                  {c.formReset}
                </button>
              </div>

              <div className="mb-3">
                <FieldLabel text={c.username} />
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder={config.usernameHint || c.usernameHint}
                  autoComplete="username"
                />
              </div>

              {mode === "login" && (
                <>
                  <div className="mb-4">
                    <FieldLabel text={c.password} />
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-100"
                        value={form.password}
                        onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder={c.passHint}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 transition hover:text-slate-100"
                        aria-label="toggle password"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Lock size={15} />
                    {busy ? c.loginBusy : c.login}
                  </button>
                </>
              )}

              {mode === "forgot" && (
                <button
                  type="submit"
                  disabled={busy || !form.username.trim()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound size={15} />
                  {c.sendCode}
                </button>
              )}

              {mode === "reset" && (
                <>
                  <div className="mb-3">
                    <FieldLabel text={c.code} />
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
                      value={form.code}
                      onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                      placeholder={c.codeHint}
                    />
                  </div>
                  <div className="mb-1">
                    <FieldLabel text={c.newPass} />
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-100"
                        value={form.newPassword}
                        onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                        placeholder={c.newPassHint}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 transition hover:text-slate-100"
                        aria-label="toggle new password"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {!hasStrongResetPassword(form.newPassword) && form.newPassword && (
                    <p className="mb-3 text-xs text-amber-200">{c.weakPass}</p>
                  )}
                  <button
                    type="submit"
                    disabled={busy || !canResetPassword}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <KeyRound size={15} />
                    {c.reset}
                  </button>
                </>
              )}
            </form>

            <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-100">
                <ShieldCheck size={15} className="text-cyan-300" />
                {c.securityGuide}
              </h2>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">{c.securityGuide1}</li>
                <li className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">{c.securityGuide2}</li>
                <li className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">{c.securityGuide3}</li>
                <li className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">{c.securityGuide4}</li>
              </ul>
            </aside>
          </div>
        )}

        {config.enabled && session.authenticated && (
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{c.session}</p>
                  <p className="mt-1 text-base font-medium text-slate-100">
                    {session.username} · {session.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{c.expiresAt}: {formatDate(session.expiresAtEpochMs, lang)}</p>
                  <p className="mt-1 text-xs text-slate-500">{c.lastRefresh}: {formatDate(lastRefreshAt, lang)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => refreshAll(true)}
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Activity size={15} />
                    {c.refresh}
                  </button>
                  <button
                    type="button"
                    onClick={doLogout}
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {c.logout}
                  </button>
                </div>
              </div>
            </div>

            {overview && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} label={lang === "tr" ? "Toplam Kullanici" : "Total Users"} value={overview.totalUsers} />
                <MetricCard icon={Users} label={lang === "tr" ? "Yeni Kullanici (24s)" : "New Users (24h)"} value={overview.usersLast24h} />
                <MetricCard icon={Database} label="Queue/Processing" value={`${overview.queuedJobs}/${overview.processingJobs}`} />
                <MetricCard icon={Clock3} label={lang === "tr" ? "Ort. Sure" : "Avg Duration"} value={`${formatDuration(overview.averageImageSeconds, lang)} · ${formatDuration(overview.averageVideoSeconds, lang)}`} />
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                  <TrendingUp size={15} className="text-cyan-300" />
                  {c.trend}
                </h2>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="pb-2 pr-3">{c.day}</th>
                      <th className="pb-2 pr-3">{c.jobs}</th>
                      <th className="pb-2 pr-3">{c.success}</th>
                      <th className="pb-2 pr-3">{c.failed}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((point) => (
                      <tr key={point.dayEpochMs} className="border-t border-slate-800 text-slate-200">
                        <td className="py-2 pr-3">{new Date(point.dayEpochMs).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}</td>
                        <td className="py-2 pr-3">{point.totalJobs}</td>
                        <td className="py-2 pr-3">{point.successJobs}</td>
                        <td className="py-2 pr-3">{point.failedJobs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>

              <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Clock3 size={15} className="text-cyan-300" />
                  {c.audit}
                </h2>
                {audit.length ? (
                  <ul className="max-h-[430px] space-y-2 overflow-y-auto pr-1 text-sm">
                    {audit.map((row, index) => (
                      <li key={`${row.createdAtEpochMs}-${index}`} className="rounded-xl border border-slate-800 px-3 py-2">
                        <p className="font-medium text-slate-100">{row.actionType}</p>
                        <p className="text-xs text-slate-400">{row.actor || "-"}</p>
                        <p className="text-xs text-slate-500">{formatDate(row.createdAtEpochMs, lang)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">{c.noAudit}</p>
                )}
              </article>
            </div>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Settings2 size={15} className="text-cyan-300" />
                  {c.settings}
                </h2>
                <div className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
                  {changedCount > 0
                    ? `${c.changedCount}: ${changedCount}`
                    : c.noSettingChange}
                </div>
              </div>
              <p className="mb-4 text-xs text-slate-400">{c.settingsHint}</p>

              <form onSubmit={doSaveSettings} className="space-y-3">
                {(settings || []).map((item) => {
                  const current = String(item.value ?? "");
                  const draft = String(draftSettings[item.key] ?? "");
                  const dirty = current !== draft;
                  return (
                    <div key={item.key} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-100">{item.label}</p>
                        <div className="flex items-center gap-2">
                          {dirty && (
                            <span className="rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-amber-100">
                              {c.settingChanged}
                            </span>
                          )}
                          <p className="text-[11px] text-slate-400">{item.key}</p>
                        </div>
                      </div>
                      <p className="mb-2 text-xs text-slate-400">{item.description}</p>
                      <p className="mb-2 text-[11px] text-slate-500">{c.settingCurrent}: {current}</p>
                      {item.type === "boolean" ? (
                        <select
                          value={draftSettings[item.key] ?? item.value ?? ""}
                          onChange={(event) => setDraftSettings((prev) => ({ ...prev, [item.key]: event.target.value }))}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          type={item.type === "int" ? "number" : "text"}
                          min={item.minValue ?? undefined}
                          max={item.maxValue ?? undefined}
                          value={draftSettings[item.key] ?? item.value ?? ""}
                          onChange={(event) => setDraftSettings((prev) => ({ ...prev, [item.key]: event.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        />
                      )}
                    </div>
                  );
                })}
                <button
                  type="submit"
                  disabled={!canSaveSettings}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={15} />
                  {saving ? c.saveBusy : c.saveChanges}
                </button>
              </form>
            </article>
          </div>
        )}
      </section>
    </main>
  );
}
