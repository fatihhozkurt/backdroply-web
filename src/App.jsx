import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import TopBar from "./components/TopBar";
import UserConsentNotice from "./components/UserConsentNotice";
import GlobalFooter from "./components/GlobalFooter";
import { useI18n } from "./i18n";
import { api } from "./lib/api";
import LandingPage from "./pages/LandingPage";
import ContactPage from "./pages/ContactPage";
import StudioPage from "./pages/StudioPage";

export default function App() {
  const { lang } = useI18n();
  const [user, setUser] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [booting, setBooting] = useState(true);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const googleEnabled = Boolean(googleClientId && !googleClientId.startsWith("replace_"));

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
      await api.post("/auth/logout");
    } catch {
      // Cookie cleanup failures should not block local logout.
    }
    setUser(null);
    setTokenBalance(0);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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
