import { NavLink } from "react-router";
import { Icon } from "./ui/Icon";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ui/Toast";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { to: "/products", label: "Products", icon: "store" as const },
];

export function SideNav() {
  const { logout } = useAuth();
  const { success } = useToast();

  function handleSignOut() {
    logout();
    success("Signed out", "Come back soon.");
  }

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col justify-between border-r border-line bg-white p-4 dark:border-line-dark dark:bg-paper-dark">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-ink text-white dark:bg-white dark:text-ink"
                    : "text-ink-soft hover:bg-surface hover:text-ink dark:text-surface/70 dark:hover:bg-surface-dark dark:hover:text-white"
                }`
              }
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2.5 rounded bg-clinic-red px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clinic-red/90"
      >
        <Icon name="power" size={17} />
        Sign Out
      </button>
    </nav>
  );
}
