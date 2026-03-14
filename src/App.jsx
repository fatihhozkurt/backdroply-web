import { useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import TopBar from "./components/TopBar";
import UserConsentNotice from "./components/UserConsentNotice";
import GlobalFooter from "./components/GlobalFooter";
import SeoHead from "./components/SeoHead";
import { useI18n } from "./i18n";
import { api } from "./lib/api";
import LandingPage from "./pages/LandingPage";
import ContactPage from "./pages/ContactPage";
import StudioPage from "./pages/StudioPage";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://backdroply.com").replace(/\/+$/, "");

function buildSeoConfig(pathname, lang) {
  const tr = lang === "tr";
  const safePath = pathname || "/";

  if (safePath.startsWith("/contact")) {
    return {
      path: "/contact",
      title: tr
        ? "Backdroply | \u0130leti\u015fim, Destek ve KVKK Ba\u015fvuru"
        : "Backdroply | Contact, Support and Data Rights",
      description: tr
        ? "Backdroply destek, KVKK ba\u015fvuru ve veri silme talepleriniz i\u00e7in resmi ileti\u015fim sayfas\u0131."
        : "Official Backdroply contact page for support, data rights and account deletion requests.",
      image: "/samples/sample-image-after.jpg",
      imageAlt: tr ? "Backdroply ileti\u015fim ve destek" : "Backdroply contact and support",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: tr ? "Backdroply \u0130leti\u015fim" : "Backdroply Contact",
        url: `${SITE_URL}/contact`,
        inLanguage: tr ? "tr" : "en"
      }
    };
  }

  if (safePath.startsWith("/studio")) {
    const rootStudio = safePath === "/studio" || safePath === "/studio/";
    return {
      path: safePath,
      title: tr
        ? "Backdroply Studio | Video ve G\u00f6rsel Arka Plan Kald\u0131rma"
        : "Backdroply Studio | AI Video and Image Background Removal",
      description: tr
        ? "Backdroply Studio'da video ve g\u00f6rsellerin arka plan\u0131n\u0131 otomatik kald\u0131r, brush ile d\u00fczelt ve \u00e7\u0131kt\u0131y\u0131 indir."
        : "Use Backdroply Studio to remove image/video backgrounds automatically, refine with brush, and export results.",
      image: "/samples/sample-video-after-demo.frame1.jpg",
      imageAlt: tr ? "Backdroply Studio video kar\u015f\u0131la\u015ft\u0131rmas\u0131" : "Backdroply Studio video comparison",
      robots: rootStudio
        ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
        : "noindex,nofollow,noarchive",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Backdroply Studio",
        url: `${SITE_URL}${safePath}`,
        inLanguage: tr ? "tr" : "en"
      }
    };
  }

  return {
    path: "/",
    title: tr
      ? "Backdroply | Video ve G\u00f6rsellerde Arka Plan Kald\u0131rma"
      : "Backdroply | Remove Backgrounds from Videos and Images",
    description: tr
      ? "Backdroply ile video ve g\u00f6rsellerde arka plan\u0131 premium kalitede kald\u0131r\u0131n. Otomatik ayr\u0131\u015ft\u0131rma, brush d\u00fczeltme, h\u0131zl\u0131 ve g\u00fcvenli \u00e7\u0131kt\u0131."
      : "Remove backgrounds from videos and images with premium quality. Automatic cutout, brush refinements, and secure fast exports.",
    image: "/samples/sample-image-after.jpg",
    imageAlt: tr ? "Backdroply g\u00f6rsel arka plan kald\u0131rma \u00f6rne\u011fi" : "Backdroply image background removal sample",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Backdroply",
          url: SITE_URL,
          email: "support@backdroply.app"
        },
        {
          "@type": "SoftwareApplication",
          name: "Backdroply",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
          inLanguage: tr ? "tr" : "en"
        },
        {
          "@type": "WebSite",
          name: "Backdroply",
          url: SITE_URL
        }
      ]
    }
  };
}

export default function App() {
  const { lang } = useI18n();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [booting, setBooting] = useState(true);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const googleEnabled = Boolean(googleClientId && !googleClientId.startsWith("replace_"));
  const seoConfig = useMemo(
    () => buildSeoConfig(location.pathname, lang),
    [location.pathname, lang]
  );

  useEffect(() => {
    let alive = true;
    api.get("/auth/csrf")
      .catch(() => {})
      .finally(() => {
        api.get("/users/me")
          .then((res) => {
            if (!alive) {
              return;
            }
            setUser(res.data);
            setTokenBalance(res.data.tokens || 0);
          })
          .catch(() => {
            if (!alive) {
              return;
            }
            setUser(null);
            setTokenBalance(0);
          })
          .finally(() => {
            if (alive) {
              setBooting(false);
            }
          });
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onGoogleSuccess(credResponse) {
    const credential = credResponse?.credential;
    if (!credential) {
      return;
    }
    try {
      await api.get("/auth/csrf").catch(() => {});
      const res = await api.post("/auth/google", { idToken: credential, language: lang });
      setUser(res.data.user);
      setTokenBalance(res.data.user?.tokens || 0);
    } catch (err) {
      console.error(err);
    }
  }

  async function onLogout() {
    try {
      // Refresh CSRF token to ensure cross-origin logout carries valid XSRF header.
      await api.get("/auth/csrf").catch(() => {});
      await api.post("/auth/logout");
      setUser(null);
      setTokenBalance(0);
    } catch (err) {
      // Keep state untouched if logout failed; otherwise refresh would appear inconsistent.
      console.error("Logout failed", err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SeoHead
        path={seoConfig.path}
        title={seoConfig.title}
        description={seoConfig.description}
        image={seoConfig.image}
        imageAlt={seoConfig.imageAlt}
        robots={seoConfig.robots}
        lang={lang}
        jsonLd={seoConfig.jsonLd}
      />
      <TopBar
        user={user}
        tokenBalance={tokenBalance}
        onLogout={onLogout}
      />
      <Routes>
        <Route
          path="/"
          element={(
            <LandingPage
              user={user}
              googleEnabled={googleEnabled}
              onGoogleSuccess={onGoogleSuccess}
            />
          )}
        />
        <Route
          path="/studio/*"
          element={
            <StudioPage
              user={user}
              setTokenBalance={setTokenBalance}
              onLogout={onLogout}
              booting={booting}
            />
          }
        />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
      <GlobalFooter />
      <UserConsentNotice />
    </div>
  );
}
