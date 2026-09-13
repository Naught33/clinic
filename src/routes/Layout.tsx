import { Outlet } from "react-router";
import { NavBar } from "../components/NavBar";
import { SideNav } from "../components/SideNav";

export default function Layout() {
  return (
    <div className="flex h-screen flex-col bg-surface dark:bg-paper-dark">
      <NavBar />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
