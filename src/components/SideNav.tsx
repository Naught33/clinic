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
    <nav className="sidenav">
      <ul className="sidenav__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => `sidenav__link${isActive ? " is-active" : ""}`}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <button type="button" onClick={handleSignOut} className="sidenav__signout">
        <Icon name="power" size={17} />
        Sign Out
      </button>
    </nav>
  );
}