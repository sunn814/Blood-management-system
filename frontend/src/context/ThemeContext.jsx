import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

// Light / dark mode. The first value is set by a small script in index.html
// (saved choice, otherwise the device setting) so the page never flashes.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* storage can be blocked - the theme still works for this visit */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
