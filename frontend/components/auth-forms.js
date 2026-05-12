"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "@/components/auth-shell";
import { apiGet, apiPost } from "@/lib/api";

export function EmailSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await apiPost("/auth/login", { email, password });
      router.push("/app");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error ? (
        <div className="auth-alert" role="alert">
          {error}
        </div>
      ) : null}

      <AuthField
        label="Work email"
        name="email"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
      />

      <div className="auth-form-row">
        <label className="auth-checkbox">
          <input type="checkbox" defaultChecked />
          <span>Keep me signed in</span>
        </label>
        <a href="/forgot-password" className="auth-text-link">
          Forgot password?
        </a>
      </div>

      <button className="button auth-submit" type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export function EmailSignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailCheck, setEmailCheck] = useState({
    status: "idle",
    message: ""
  });

  function defaultWorkspaceName() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return "My Workspace";
    }

    return `${trimmedName.split(" ")[0]}'s Workspace`;
  }

  useEffect(() => {
    if (step !== 1) {
      return undefined;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailCheck({ status: "idle", message: "" });
      return undefined;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailCheck({ status: "invalid", message: "Enter a valid email address." });
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setEmailCheck({ status: "checking", message: "Checking email availability..." });
        const result = await apiGet(`/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`, {
          credentials: "omit"
        });

        if (result?.available) {
          setEmailCheck({ status: "available", message: "Email is available." });
          return;
        }

        setEmailCheck({
          status: "unavailable",
          message:
            result?.reason === "provider_linked"
              ? "This email is already linked to another sign-in method."
              : "This email is already registered."
        });
      } catch (_error) {
        setEmailCheck({ status: "idle", message: "" });
      }
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [email, step]);

  function handleContinue(event) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Complete all account fields to continue.");
      return;
    }

    if (emailCheck.status === "checking") {
      setError("Wait a moment while we verify the email address.");
      return;
    }

    if (emailCheck.status === "unavailable") {
      setError(emailCheck.message || "This email is already registered.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!workspaceName.trim()) {
      setWorkspaceName(defaultWorkspaceName());
    }

    setStep(2);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await apiPost("/auth/signup", {
        name: name.trim(),
        email: email.trim(),
        password,
        workspaceName: workspaceName.trim() || defaultWorkspaceName()
      });
      router.push("/app?welcome=1");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message || "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form auth-form-grid" onSubmit={handleSubmit}>
      {error ? (
        <div className="auth-alert auth-alert-wide" role="alert">
          {error}
        </div>
      ) : null}

      <div className="auth-setup-steps auth-alert-wide" aria-label="Signup progress">
        <span className={`auth-setup-step ${step === 1 ? "is-active" : step > 1 ? "is-complete" : ""}`}>1. Account</span>
        <span className={`auth-setup-step ${step === 2 ? "is-active" : ""}`}>2. Workspace setup</span>
      </div>

      {step === 1 ? (
        <>
          <AuthField
            label="Full name"
            name="name"
            placeholder="Alex Johnson"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
          />
          <AuthField
            label="Work email"
            name="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            hint={emailCheck.message}
            hintTone={
              emailCheck.status === "available"
                ? "success"
                : emailCheck.status === "unavailable" || emailCheck.status === "invalid"
                  ? "danger"
                  : "default"
            }
          />
          <AuthField
            label="Password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
          <AuthField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />

          <label className="auth-checkbox auth-checkbox-wide">
            <input type="checkbox" defaultChecked />
            <span>I agree to receive product updates and AI delivery alerts.</span>
          </label>

          <button className="button auth-submit" type="button" onClick={handleContinue}>
            Continue setup
          </button>
        </>
      ) : (
        <>
          <div className="auth-setup-panel auth-alert-wide">
            <strong>Workspace setup</strong>
            <p>This name will be used for your team workspace, reports, and dashboard context.</p>
          </div>

          <AuthField
            label="Workspace name"
            name="workspaceName"
            placeholder={defaultWorkspaceName()}
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            autoComplete="organization"
          />

          <div className="auth-setup-summary auth-alert-wide">
            <strong>Owner account</strong>
            <span>{name.trim() || "Your name"}</span>
            <span>{email.trim() || "you@company.com"}</span>
          </div>

          <div className="auth-setup-actions auth-alert-wide">
            <button className="button-secondary" type="button" onClick={() => setStep(1)} disabled={submitting}>
              Back
            </button>
            <button className="button auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Creating workspace..." : "Finish setup"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
