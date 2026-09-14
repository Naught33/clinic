import { useTheme } from "../../context/ThemeContext";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className="theme-toggle"
    >
      <span className="theme-toggle__thumb">
        <Icon name={isDark ? "moon" : "sun"} size={13} />
      </span>
    </button>
  );
}
