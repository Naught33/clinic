import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { saveSessionSnapshot } from "../lib/client";
import { PageSpinner } from "./ui/Spinner";

/**
 * Gate for the authenticated part of the tree. On redirect, stashes the
 * current path via the client's session snapshot so Decision Log #4's
 * "resume where you left off" flow has something to resume from.
 */
export function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSpinner label="Checking your session" />;

  if (!isAuthenticated) {
    saveSessionSnapshot({ path: location.pathname + location.search });
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
