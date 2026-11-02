import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" className="ghost theme-toggle" onClick={toggle} aria-pressed={dark}>
      {dark ? "Switch to light mode" : "Switch to dark mode"}
    </button>
  );
}
