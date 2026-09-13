import { Outlet } from "react-router";
import { NavBar } from "../components/NavBar";
import { SideNav } from "../components/SideNav";

export default function Layout() {
  return (
    <div className="app-shell">
      <NavBar />
      <div className="app-shell__content">
        <SideNav />
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}