import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useI18n } from "../i18n";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: ""
};

export default function ContactPage() {
  const { t, lang } = useI18n();
  const tr = lang === "tr";
  const copy = {
    back: t.contactBack || (tr ? "Ana sayfaya dön" : "Back to home"),
    title: t.contactTitle || (tr ? "İletişim ve KVKK Başvuru Kanalı" : "Contact and Data Subject Channel"),
    desc: t.contactDesc || ((hours) => (tr ? `Destek taleplerine hedef yanıt süremiz ${hours} saattir.` : `Our target response SLA for support requests is ${hours} hours.`)),
    supportEmail: t.contactSupportEmail || (tr ? "Destek e-postası" : "Support email"),
    kvkkEmail: t.contactKvkkEmail || (tr ? "KVKK başvuru e-postası" : "Data rights email"),
    phone: t.contactPhone || (tr ? "Telefon" : "Phone"),
    kep: t.contactKep || (tr ? "KEP" : "Registered e-mail (KEP)"),
    dataRights: t.contactDataRights || (tr ? "Veri sahibi başvuru ve hesap silme detayları için:" : "For account deletion and data subject rights details:"),
    dataDeletionLink: t.contactDataDeletionLink || (tr ? "veri silme politikası" : "data deletion policy"),
    formTitle: t.contactFormTitle || (tr ? "Destek formu" : "Support form"),
    nameLabel: t.contactNameLabel || (tr ? "Ad soyad" : "Full name"),
    emailLabel: t.contactEmailLabel || (tr ? "E-posta" : "Email"),
    subjectLabel: t.contactSubjectLabel || (tr ? "Konu" : "Subject"),
    messageLabel: t.contactMessageLabel || (tr ? "Mesaj" : "Message"),
    submit: t.contactSubmit || (tr ? "Talep gönder" : "Send request"),
    sending: t.contactSending || (tr ? "Gönderiliyor..." : "Sending..."),
    sent: t.contactSent || ((ticketId, hours) => (tr ? `Talebin alındı. Takip no: #${ticketId}. Hedef dönüş süresi: ${hours} saat.` : `Your request was received. Ticket #${ticketId}. Target response SLA: ${hours} hours.`)),
    sendFailed: t.contactSendFailed || (tr ? "Talep gönderilemedi." : "Request could not be sent.")
  };
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/support/public-info")
      .then((res) => {
        if (!alive) {
          return;
        }
        setInfo(res.data);
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setInfo(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  function onFieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitContact(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const payload = {
        ...form,
        language: lang,
        source: "web"
      };
      const res = await api.post("/support/contact", payload);
      setForm(initialForm);
      setStatus(copy.sent(res.data?.ticketId, res.data?.responseSlaHours ?? info?.responseSlaHours ?? 48));
    } catch (err) {
      setStatus(err?.response?.data?.error || copy.sendFailed);
    } finally {
      setBusy(false);
    }
  }

  const supportEmail = info?.supportEmail || "support@backdroply.app";
  const kvkkEmail = info?.kvkkEmail || "kvkk@backdroply.app";
  const dataDeletionUrl = info?.dataDeletionUrl || "/legal/privacy.html";
  const supportPhone = info?.supportPhone || "";
  const supportKep = info?.supportKep || "";
  const responseSlaHours = info?.responseSlaHours || 48;

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute left-0 top-4 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute right-2 top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-5 shadow-[0_24px_70px_rgba(2,6,23,.56)]"
      >
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 hover:text-sky-200"
          >
            <ArrowLeft size={14} />
            {copy.back}
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.08fr,.92fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h1 className="text-2xl font-semibold text-slate-100">{copy.title}</h1>
            <p className="mt-1 text-sm text-slate-300">{copy.desc(responseSlaHours)}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={<Mail size={15} />}
                title={copy.supportEmail}
                value={supportEmail}
                href={`mailto:${supportEmail}`}
              />
              <InfoCard
                icon={<ShieldCheck size={15} />}
                title={copy.kvkkEmail}
                value={kvkkEmail}
                href={`mailto:${kvkkEmail}`}
              />
              {supportPhone ? (
                <InfoCard
                  icon={<Phone size={15} />}
                  title={copy.phone}
                  value={supportPhone}
                  href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                />
              ) : null}
              {supportKep ? (
                <InfoCard
                  icon={<Mail size={15} />}
                  title={copy.kep}
                  value={supportKep}
                />
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
              {copy.dataRights}
              <a
                href={dataDeletionUrl.startsWith("http") ? dataDeletionUrl : `${dataDeletionUrl}?lang=${lang}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-sky-300 underline-offset-2 transition hover:text-sky-200 hover:underline"
              >
                {copy.dataDeletionLink}
              </a>
            </div>
          </div>

          <form onSubmit={submitContact} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-100">{copy.formTitle}</div>
            <div className="grid gap-3">
              <label className="text-xs text-slate-300">
                {copy.nameLabel}
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/60"
                />
              </label>
              <label className="text-xs text-slate-300">
                {copy.emailLabel}
                <input
                  required
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => onFieldChange("email", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/60"
                />
              </label>
              <label className="text-xs text-slate-300">
                {copy.subjectLabel}
                <input
                  required
                  maxLength={180}
                  value={form.subject}
                  onChange={(e) => onFieldChange("subject", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/60"
                />
              </label>
              <label className="text-xs text-slate-300">
                {copy.messageLabel}
                <textarea
                  required
                  maxLength={5000}
                  rows={6}
                  value={form.message}
                  onChange={(e) => onFieldChange("message", e.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/60"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? copy.sending : copy.submit}
            </button>
            {status ? (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">{status}</div>
            ) : null}
          </form>
        </div>
      </motion.section>
    </main>
  );
}

function InfoCard({ icon, title, value, href }) {
  const body = (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
        {icon}
        {title}
      </div>
      <div className="text-sm text-slate-100">{value}</div>
    </div>
  );

  if (!href) {
    return body;
  }
  return (
    <a href={href} className="block transition hover:scale-[1.01] hover:brightness-110">
      {body}
    </a>
  );
}
