import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { getSessionSnapshot, clearSessionSnapshot } from "../lib/client";

export default function Auth() {
  const { login, isLoading } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [username, setUsername] = useState("emilys");
  const [password, setPassword] = useState("emilyspass");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const user = await login({ username, password });
    if (user) {
      success("Welcome back", `Signed in as ${user.firstName} ${user.lastName}`);
      const snapshot = getSessionSnapshot();
      clearSessionSnapshot();
      navigate(snapshot?.page ? location.state?.from ?? "/dashboard" : location.state?.from ?? "/dashboard", {
        replace: true,
      });
    } else {
      toastError("Sign in failed", "Check your username and password and try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 dark:bg-paper-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded bg-ink text-lg font-bold text-white dark:bg-white dark:text-ink">
            C
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink dark:text-white">
              Clinic-O
            </h1>
            <p className="mt-1 text-sm text-ink-soft dark:text-surface/60">
              Sign in to manage your inventory
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-md border border-line bg-white p-6 shadow-panel dark:border-line-dark dark:bg-[#161A18]"
        >
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-[13px] font-medium text-ink dark:text-white">
              Username
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon="user"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-ink dark:text-white">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" loading={isLoading} className="w-full">
            Sign in
          </Button>

          <p className="text-center text-[12px] text-ink-soft dark:text-surface/50">
            Demo credentials are pre-filled — just press sign in.
          </p>
        </form>
      </div>
    </div>
  );
}
