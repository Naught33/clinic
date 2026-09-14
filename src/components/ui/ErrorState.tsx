import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";

/** Failed attempts before we switch from "retry" to "report". */
const MAX_RETRIES = 3;

export interface BugReport {
  timestamp: string;
  errorCode: number;
  errorMessage: string;
}

interface ErrorStateProps {
  title: string;
  description?: string;
  code: number;
  message: string;
  retryLabel?: string;
  onRetry: () => void;
  /** Extra action (e.g. "Go back") shown alongside the retry/report button. */
  secondaryAction?: ReactNode;
}

/**
 * Error surface with a built-in retry budget. The first three failures offer
 * a "Try again" button; once that budget is spent we hand the user a bug
 * report UI that logs `{ timestamp, errorCode, errorMessage }` to the console.
 * No backend exists yet, so "reporting" is intentionally just a console log.
 */
export function ErrorState({
  title,
  description,
  code,
  message,
  retryLabel = "Try again",
  onRetry,
  secondaryAction,
}: ErrorStateProps) {
  const [attempts, setAttempts] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleRetry() {
    setAttempts((n) => n + 1);
    onRetry();
  }

  function handleSubmitReport() {
    const report: BugReport = {
      timestamp: new Date().toISOString(),
      errorCode: code,
      errorMessage: message,
    };
    console.log("[bug-report]", report);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <EmptyState
        icon="check"
        title="Bug report submitted"
        description="Thanks for your patience — the details were logged to the console for the team to inspect."
      />
    );
  }

  const budgetSpent = attempts >= MAX_RETRIES;

  return (
    <div className="error-state">
      <EmptyState
        icon="alert"
        title={title}
        description={description ?? message}
        action={
          <div className="error-state__actions">
            {budgetSpent ? (
              <Button variant="secondary" size="sm" onClick={handleSubmitReport}>
                Report a bug
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                {retryLabel}
              </Button>
            )}
            {secondaryAction}
          </div>
        }
      />
      {budgetSpent && !submitted && (
        <div className="error-state__report">
          <p className="error-state__report-title">
            <Icon name="alert" size={14} />
            Still stuck after {MAX_RETRIES} attempts
          </p>
          <dl className="error-state__report-meta">
            <div>
              <dt>Timestamp</dt>
              <dd>{new Date().toLocaleString()}</dd>
            </div>
            <div>
              <dt>Error code</dt>
              <dd>{code}</dd>
            </div>
            <div>
              <dt>Error message</dt>
              <dd>{message}</dd>
            </div>
          </dl>
          <p className="error-state__report-hint">
            Submitting sends the details above to the console — there's no backend behind it yet.
          </p>
        </div>
      )}
    </div>
  );
}
