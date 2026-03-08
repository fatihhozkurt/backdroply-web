import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n";
import "./index.css";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const googleEnabled = Boolean(clientId && !clientId.startsWith("replace_"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {googleEnabled ? (
      <GoogleOAuthProvider clientId={clientId}>
        <LanguageProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LanguageProvider>
      </GoogleOAuthProvider>
    ) : (
      <LanguageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LanguageProvider>
    )}
  </StrictMode>
);
