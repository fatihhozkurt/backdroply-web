import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import {
  ArrowDown,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  LogIn,
  ShieldCheck,
  Sparkles,
  X,
  WandSparkles
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompareShowcaseCard from "../components/CompareShowcaseCard";
import FlashWord from "../components/FlashWord";
import GuideModal from "../components/GuideModal";
import { useI18n } from "../i18n";

const rise = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 }
};

const AUTH_CARD_LAYOUT_ID = "landing-auth-card";
const authCardTransition = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.9
};

export default function LandingPage({ user, googleEnabled, onGoogleSuccess }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [openGuide, setOpenGuide] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [oauthError, setOauthError] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("backdroply_guide_seen") || localStorage.getItem("clipcut_guide_seen");
    if (!seen) {
      setOpenGuide(true);
    }
  }, []);

  function closeGuide() {
    localStorage.setItem("backdroply_guide_seen", "1");
    localStorage.setItem("clipcut_guide_seen", "1");
    setOpenGuide(false);
  }

  useEffect(() => {
    if (!openAuthModal) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenAuthModal(false);
        setOauthError(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openAuthModal]);

  async function handleGoogleSuccess(payload, { openStudio = false } = {}) {
    setOauthError(false);
    await onGoogleSuccess?.(payload);
    if (openStudio) {
      setOpenAuthModal(false);
      navigate("/studio");
    }
  }

  function scrollToSamples(event) {
    event.preventDefault();
    const el = document.getElementById("samples");
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleOpenStudio() {
    if (user) {
      navigate("/studio");
      return;
    }
    setOauthError(false);
    setOpenAuthModal(true);
  }

  function closeAuthModal() {
    setOpenAuthModal(false);
    setOauthError(false);
  }

  return (
    <LayoutGroup id="landing-auth-flow">
      <main className="relative overflow-hidden pb-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,.10),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,.14),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(3,105,161,.12),transparent_36%)]" />
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="grid gap-4 rounded-[34px] border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-[#041433]/95 to-slate-950/95 p-5 shadow-[0_30px_95px_rgba(2,8,23,.62)] sm:p-6 lg:grid-cols-[1.72fr_.98fr] lg:items-start"
          >
            <div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="mb-4 inline-flex rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-sky-200"
              >
                {t.heroTag}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="max-w-none text-4xl font-semibold leading-[1.03] text-slate-100 md:text-[52px] xl:text-[56px]"
              >
                {t.heroTitleStart}
                <FlashWord>{t.heroTitleEmphasis}</FlashWord>
                {t.heroTitleEnd}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.14 }}
                className="mt-2.5 max-w-2xl text-base text-slate-300 md:text-lg"
              >
                {t.heroDesc}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18 }}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  className="primary-shine-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,.24)] transition hover:brightness-110"
                  onClick={handleOpenStudio}
                >
                  {t.heroCta}
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 transition hover:border-slate-500"
                  onClick={() => setOpenGuide(true)}
                >
                  {t.guideTitle}
                </button>
              </motion.div>
              <p className="mt-2 text-xs text-slate-400">{t.heroScrollHint}</p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Feature icon={<WandSparkles size={16} />} title={t.featureAutoTitle} desc={t.featureAutoDesc} />
                <Feature icon={<ShieldCheck size={16} />} title={t.featureSecureTitle} desc={t.featureSecureDesc} />
                <Feature icon={<ChartNoAxesColumnIncreasing size={16} />} title={t.featureSaasTitle} desc={t.featureSaasDesc} />
              </div>
            </div>

            {!openAuthModal && (
              <LandingAuthCard
                user={user}
                googleEnabled={googleEnabled}
                oauthError={oauthError}
                t={t}
                onGoogleSuccess={(payload) => handleGoogleSuccess(payload)}
                onGoogleError={() => setOauthError(true)}
              />
            )}
          </motion.section>

          <motion.div
            {...rise}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
            className="mt-4 flex justify-center"
          >
            <a
              href="#samples"
              onClick={scrollToSamples}
              className="soft-glow-pulse inline-flex cursor-pointer items-center gap-2 rounded-full border border-sky-300/35 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-sky-200 transition hover:border-sky-200/55 hover:bg-sky-400/18"
            >
              {t.showcaseTitle}
              <ArrowDown size={14} className="animate-bounce" />
            </a>
          </motion.div>

          <motion.section
            {...rise}
            transition={{ duration: 0.45, ease: "easeOut" }}
            id="samples"
            className="scroll-mt-24 mt-8 rounded-[28px] border border-slate-800 bg-gradient-to-b from-slate-900/75 to-slate-950/65 p-6"
          >
            <div className="mb-2 text-2xl font-semibold text-slate-100">{t.showcaseTitle}</div>
            <p className="mb-4 max-w-3xl text-sm text-slate-300">{t.showcaseDesc}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <CompareShowcaseCard
                kind="image"
                title={t.sampleImageTitle}
                beforeSrc="/samples/sample-image-before.jpg"
                afterSrc="/samples/sample-image-after.jpg"
                beforeLabel={t.beforeLabel}
                afterLabel={t.afterLabel}
                dragHint={t.dragHint}
              />
              <CompareShowcaseCard
                kind="video"
                title={t.sampleVideoTitle}
                beforeSrc="/samples/sample-video-before-demo.mp4"
                afterSrc="/samples/sample-video-after-demo.mp4"
                beforePosterSrc="/samples/sample-video-before-demo.frame1.jpg"
                afterPosterSrc="/samples/sample-video-after-demo.frame1.jpg"
                beforeLabel={t.beforeLabel}
                afterLabel={t.afterLabel}
                dragHint={t.dragHint}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400">{t.sampleCredits}</div>
          </motion.section>

        </div>

        <AnimatePresence>
          {openAuthModal && !user && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeAuthModal();
                }
              }}
            >
              <LandingAuthCard
                user={user}
                googleEnabled={googleEnabled}
                oauthError={oauthError}
                t={t}
                modal
                onClose={closeAuthModal}
                onGoogleSuccess={(payload) => handleGoogleSuccess(payload, { openStudio: true })}
                onGoogleError={() => setOauthError(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <GuideModal open={openGuide} onClose={closeGuide} />
      </main>
    </LayoutGroup>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4"
    >
      <div className="mb-2 inline-flex rounded-lg bg-slate-800 p-2 text-sky-200">{icon}</div>
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <p className="mt-1 text-xs text-slate-300">{desc}</p>
    </motion.div>
  );
}

function LandingAuthCard({
  user,
  googleEnabled,
  oauthError,
  t,
  onGoogleSuccess,
  onGoogleError,
  modal = false,
  onClose
}) {
  return (
    <motion.div
      layoutId={!user ? AUTH_CARD_LAYOUT_ID : undefined}
      transition={authCardTransition}
      initial={modal ? { opacity: 0.94, scale: 0.98 } : false}
      animate={modal ? { opacity: 1, scale: 1 } : false}
      exit={modal ? { opacity: 0.94, scale: 0.98 } : false}
      className={
        modal
          ? "w-full max-w-xl rounded-[30px] border border-slate-700/90 bg-gradient-to-b from-slate-900/96 via-[#071a3d]/96 to-slate-950/96 p-5 shadow-[0_38px_110px_rgba(2,6,23,.78)] sm:p-6"
          : "self-start rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-[#061a3b]/70 p-4"
      }
      onClick={modal ? (event) => event.stopPropagation() : undefined}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-300">
          <LogIn size={13} />
          {t.landingSignInTitle}
        </div>
        {modal && (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/85 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            onClick={onClose}
            aria-label={t.close}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <p className={`${modal ? "mb-3 text-base" : "mb-2.5 text-sm"} text-slate-300`}>
        {t.landingSignInDesc}
      </p>
      <p className={`${modal ? "mb-4 text-sm" : "mb-2.5 text-xs"} leading-relaxed text-slate-400`}>
        {t.landingSignInEase}
      </p>

      {!user ? (
        googleEnabled ? (
          <div className="rounded-xl bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,.18)]">
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
              useOneTap={false}
              shape="pill"
              text="signin_with"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-xs text-amber-100">
            {t.landingSignInMissing}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {t.landingSignedIn}
        </div>
      )}

      {oauthError && (
        <div className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-xs text-rose-100">
          {t.oauthOriginHint}
          <div className="mt-1 font-semibold text-rose-200">{window.location.origin}</div>
        </div>
      )}
    </motion.div>
  );
}
