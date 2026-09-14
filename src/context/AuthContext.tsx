import { createContext, useContext, type ReactNode } from "react";
import { useAuthSession, useActivityTracker, useAuthEvent } from "../lib/hooks";
import type { User, LoginPayload, ApiError } from "../lib/client";
import { useToast } from "../components/ui/Toast";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | null;
  login: (payload: LoginPayload) => Promise<User | undefined>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const { error: toastError, notify } = useToast();

  useActivityTracker(session.isAuthenticated);

  useAuthEvent("auth:session-expired", () => {
    toastError(
      "Session expired",
      "You've been signed out due to inactivity. Please sign in again.",
    );
  });

  useAuthEvent("auth:debug-refresh", (payload) => {
    const message = (payload as { message?: string } | undefined)?.message;
    notify({ variant: "info", title: "Session refreshed", description: message });
  });

  useAuthEvent("auth:refresh-failed", (payload) => {
    const { message, status } =
      (payload as { message?: string; status?: number } | undefined) ?? {};
    notify({
      variant: "info",
      title: "Session refresh failed",
      description:
        `We couldn't refresh your session (${status ?? "network"}). ` +
        `You'll be signed in until the current token expires. ${message ?? ""}`.trim(),
    });
  });

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        isAuthenticated: session.isAuthenticated,
        isLoading: session.isLoading,
        error: session.error,
        login: session.login,
        logout: session.logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
