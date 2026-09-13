import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui/Avatar";
import { ThemeToggle } from "./ui/ThemeToggle";

export function NavBar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="navbar__logo">C</span>
        <span className="navbar__title">Clinic-O</span>
      </div>

      <div className="navbar__right">
        <ThemeToggle />
        <div className="navbar__user">
          <div className="navbar__user-meta">
            <p className="navbar__user-name">
              {user ? `${user.firstName} ${user.lastName}` : "Guest"}
            </p>
            <p className="navbar__user-email">{user?.email ?? ""}</p>
          </div>
          <Avatar src={user?.image} name={user?.firstName} size={38} />
        </div>
      </div>
    </header>
  );
}