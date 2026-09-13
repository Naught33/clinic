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
    <div className="auth-page">
      <div className="auth-wrap">
        <div className="auth-header">
          <span className="auth-header__logo">C</span>
          <div>
            <h1 className="auth-header__title">Clinic-O</h1>
            <p className="auth-header__subtitle">Sign in to manage your inventory</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label htmlFor="username" className="auth-field__label">
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

          <div>
            <label htmlFor="password" className="auth-field__label">
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

          <p className="auth-hint">Demo credentials are pre-filled — just press sign in.</p>
        </form>
      </div>
    </div>
  );
}