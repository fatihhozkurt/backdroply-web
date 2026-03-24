import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEMES = ["midnight", "redpanda"];
const THEME_STORAGE_KEY = "backdroply_theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(saved) ? saved : "midnight";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme) => {
        setThemeState(THEMES.includes(nextTheme) ? nextTheme : "midnight");
      }
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
