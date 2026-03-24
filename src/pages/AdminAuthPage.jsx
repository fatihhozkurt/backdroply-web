import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Clock3, Database, KeyRound, Lock, Save, Settings2, ShieldCheck, TrendingUp, Users } from "lucide-react";
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

export default function AdminAuthPage() {
  const { lang } = useI18n();
  const c = useMemo(() => (lang === "tr" ? {
    title: "Özel Yönetim Paneli",
    subtitle: "Gerçek metrikler, canlı ayarlar ve denetim kayıtları",
    back: "Ana sayfaya dön",
    disabled: "Bu ortamda admin auth kapalı.",
    username: "Kullanıcı adı",
    password: "Şifre",
    login: "Giriş yap",
    loginBusy: "Giriş yapılıyor...",
    forgot: "Şifre sıfırla",
    code: "Kod",
    newPass: "Yeni şifre",
    sendCode: "Kod gönder",
    reset: "Şifreyi güncelle",
    logout: "Çıkış yap",
    refresh: "Yenile",
    session: "Oturum açık",
    invalid: "İşlem başarısız.",
    forgotDone: "Hesap varsa kod e-postaya gönderildi.",
    resetDone: "Şifre güncellendi.",
    save: "Ayarları kaydet",
    saveBusy: "Kaydediliyor...",
    saved: "Ayarlar kaydedildi.",
    noDiff: "Kaydedilecek değişiklik yok.",
    trend: "Trend (14 gün)",
    settings: "Canlı Operasyon Ayarları",
    settingsHint: "Bu ayarlar backend akışlarına anlık uygulanır.",
    audit: "Denetim Kaydı",
    day: "Gün",
    jobs: "İş",
    success: "Başarılı",
    failed: "Hata",
    noAudit: "Kayıt yok."
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
    noAudit: "No audit entries."
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
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", code: "", newPassword: "" });

  async function refreshAll() {
    const sessionRes = await api.get("/admin-auth/session");
    const next = sessionRes.data || EMPTY_SESSION;
    setSession(next);
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
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.get("/auth/csrf").catch(() => {});
        const cfg = await api.get("/admin-auth/config");
        if (!alive) return;
        setConfig(cfg.data || { enabled: false, usernameHint: "" });
        await refreshAll();
      } catch {
        if (alive) setError(c.invalid);
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => { alive = false; };
  }, [c.invalid]);

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true); setError(""); setStatus("");
    try {
      await api.get("/auth/csrf").catch(() => {});
      await api.post("/admin-auth/login", { username: form.username, password: form.password });
      await refreshAll();
      setForm((p) => ({ ...p, password: "" }));
      setMode("login");
    } catch (err) {
      setError(err?.response?.data?.error || c.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function doForgot(e) {
    e.preventDefault();
    setBusy(true); setError(""); setStatus("");
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

  async function doReset(e) {
    e.preventDefault();
    setBusy(true); setError(""); setStatus("");
    try {
      await api.get("/auth/csrf").catch(() => {});
      await api.post("/admin-auth/reset-password", { username: form.username, code: form.code, newPassword: form.newPassword });
      setStatus(c.resetDone);
      setMode("login");
    } catch (err) {
      setError(err?.response?.data?.error || c.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    setBusy(true); setError(""); setStatus("");
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

  async function doSaveSettings(e) {
    e.preventDefault();
    setSaving(true); setError(""); setStatus("");
    const updates = changed(settings, draftSettings);
    if (!updates.length) {
      setStatus(c.noDiff);
      setSaving(false);
      return;
    }
    try {
      await api.get("/auth/csrf").catch(() => {});
      const res = await api.post("/admin-auth/settings", { settings: updates });
      const newSettings = res?.data?.settings || [];
      setSettings(newSettings);
      setDraftSettings(toDraft(newSettings));
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
    return <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">{lang === "tr" ? "Yükleniyor..." : "Loading..."}</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100">
          <ArrowLeft size={14} /> {c.back}
        </Link>
      </div>
      <section className="mx-auto mt-4 w-full max-w-7xl rounded-[2rem] border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100"><ShieldCheck size={14} /> /auth</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-100 md:text-4xl">{c.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{c.subtitle}</p>
        {!config.enabled ? <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{c.disabled}</div> : null}
        {error ? <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        {status ? <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{status}</div> : null}

        {config.enabled && !session.authenticated ? (
          <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <form onSubmit={doLogin} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-200"><KeyRound size={16} className="text-cyan-300" />{c.login}</p>
              <input className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder={config.usernameHint || "owner"} />
              <input type="password" className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              <button type="submit" disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950"><Lock size={15} />{busy ? c.loginBusy : c.login}</button>
            </form>
            <form onSubmit={mode === "login" ? doForgot : doReset} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
              <button type="button" onClick={() => setMode(mode === "login" ? "reset" : "login")} className="cursor-pointer text-xs text-slate-300 underline">{mode === "login" ? c.forgot : c.login}</button>
              {mode === "login" ? (
                <>
                  <input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder={c.username} />
                  <button type="submit" disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm text-cyan-100">{c.sendCode}</button>
                </>
              ) : (
                <>
                  <input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder={c.username} />
                  <input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder={c.code} />
                  <input type="password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" value={form.newPassword} onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder={c.newPass} />
                  <button type="submit" disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm text-cyan-100">{c.reset}</button>
                </>
              )}
            </form>
          </div>
        ) : null}

        {config.enabled && session.authenticated ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs uppercase tracking-[0.14em] text-slate-400">{c.session}</p><p className="mt-1 text-base font-medium text-slate-100">{session.username} · {session.email}</p><p className="mt-1 text-xs text-slate-400">{formatDate(session.expiresAtEpochMs, lang)}</p></div>
              <div className="flex gap-2">
                <button type="button" onClick={refreshAll} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-200"><Activity size={15} />{c.refresh}</button>
                <button type="button" onClick={doLogout} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-100">{c.logout}</button>
              </div>
            </div>

            {overview ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} label={lang === "tr" ? "Toplam Kullanıcı" : "Total Users"} value={overview.totalUsers} />
                <MetricCard icon={Users} label={lang === "tr" ? "Yeni Kullanıcı (24s)" : "New Users (24h)"} value={overview.usersLast24h} />
                <MetricCard icon={Database} label={lang === "tr" ? "Queue/Processing" : "Queue/Processing"} value={`${overview.queuedJobs}/${overview.processingJobs}`} />
                <MetricCard icon={Clock3} label={lang === "tr" ? "Ort. Süre" : "Avg Duration"} value={`${formatDuration(overview.averageImageSeconds, lang)} · ${formatDuration(overview.averageVideoSeconds, lang)}`} />
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-200"><TrendingUp size={15} className="text-cyan-300" />{c.trend}</h2>
                <table className="min-w-full text-sm">
                  <thead><tr className="text-left text-slate-400"><th className="pb-2 pr-3">{c.day}</th><th className="pb-2 pr-3">{c.jobs}</th><th className="pb-2 pr-3">{c.success}</th><th className="pb-2 pr-3">{c.failed}</th></tr></thead>
                  <tbody>{trend.map((p) => <tr key={p.dayEpochMs} className="border-t border-slate-800 text-slate-200"><td className="py-2 pr-3">{new Date(p.dayEpochMs).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}</td><td className="py-2 pr-3">{p.totalJobs}</td><td className="py-2 pr-3">{p.successJobs}</td><td className="py-2 pr-3">{p.failedJobs}</td></tr>)}</tbody>
                </table>
              </article>
              <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-200"><Clock3 size={15} className="text-cyan-300" />{c.audit}</h2>
                {audit.length ? <ul className="max-h-[430px] space-y-2 overflow-y-auto pr-1 text-sm">{audit.map((row, i) => <li key={`${row.createdAtEpochMs}-${i}`} className="rounded-xl border border-slate-800 px-3 py-2"><p className="font-medium text-slate-100">{row.actionType}</p><p className="text-xs text-slate-400">{row.actor || "-"}</p><p className="text-xs text-slate-500">{formatDate(row.createdAtEpochMs, lang)}</p></li>)}</ul> : <p className="text-sm text-slate-400">{c.noAudit}</p>}
              </article>
            </div>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-200"><Settings2 size={15} className="text-cyan-300" />{c.settings}</h2>
              <p className="mb-4 text-xs text-slate-400">{c.settingsHint}</p>
              <form onSubmit={doSaveSettings} className="space-y-3">
                {(settings || []).map((item) => (
                  <div key={item.key} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-medium text-slate-100">{item.label}</p><p className="text-[11px] text-slate-400">{item.key}</p></div>
                    <p className="mb-2 text-xs text-slate-400">{item.description}</p>
                    {item.type === "boolean" ? (
                      <select value={String(draftSettings[item.key] ?? item.value ?? "")} onChange={(e) => setDraftSettings((p) => ({ ...p, [item.key]: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                        <option value="true">true</option><option value="false">false</option>
                      </select>
                    ) : (
                      <input type={item.type === "int" ? "number" : "text"} min={item.minValue ?? undefined} max={item.maxValue ?? undefined} value={draftSettings[item.key] ?? item.value ?? ""} onChange={(e) => setDraftSettings((p) => ({ ...p, [item.key]: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                    )}
                  </div>
                ))}
                <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950"><Save size={15} />{saving ? c.saveBusy : c.save}</button>
              </form>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-400"><Icon size={14} className="text-cyan-300" />{label}</div>
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
    </article>
  );
}
