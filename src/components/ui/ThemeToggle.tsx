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
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-line bg-surface transition-colors dark:border-line-dark dark:bg-surface-dark"
    >
      <span
        className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink shadow-panel transition-transform duration-200 dark:bg-ink dark:text-white ${
          isDark ? "translate-x-[26px]" : "translate-x-0.5"
        }`}
      >
        <Icon name={isDark ? "moon" : "sun"} size={13} />
      </span>
    </button>
  );
}
