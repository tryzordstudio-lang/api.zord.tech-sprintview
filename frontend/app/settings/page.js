"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageIntro, Surface } from "@/components/ui";
import { apiGet, apiPatch, apiRequest } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [meta, setMeta] = useState({
    name: "",
    email: "",
    workspaceName: "",
    hasPassword: true
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [deleteForm, setDeleteForm] = useState({
    confirmation: "",
    password: ""
  });
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const session = await apiGet("/users/me");
        if (!active) {
          return;
        }

        const providers = session?.user?.authProviders || [];
        setMeta({
          name: session?.user?.name || "Workspace user",
          email: session?.user?.email || "",
          workspaceName: session?.workspace?.name || "Workspace",
          hasPassword: providers.includes("password")
        });
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load account settings.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function updatePasswordField(key, value) {
    setPasswordForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateDeleteField(key, value) {
    setDeleteForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handlePasswordSave(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (meta.hasPassword && !passwordForm.currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await apiPatch("/auth/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      router.replace("/signin");
      router.refresh();
    } catch (saveError) {
      setError(saveError.message || "Unable to update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (deleteForm.confirmation !== "DELETE") {
      setError('Type "DELETE" to confirm account removal.');
      return;
    }

    if (meta.hasPassword && !deleteForm.password) {
      setError("Password is required to delete this account.");
      return;
    }

    try {
      setDeletingAccount(true);
      await apiRequest("/auth/account", {
        method: "DELETE",
        body: {
          confirmation: deleteForm.confirmation,
          password: deleteForm.password
        }
      });
      router.replace("/signin");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <AppShell>
      <PageIntro
        eyebrow="Account Settings"
        title="Settings"
        description="Manage password access and permanently remove this SprintView account."
      />

      {error ? <div className="auth-alert">{error}</div> : null}
      {success ? <div className="manual-sprint-success">{success}</div> : null}

      <section className="settings-layout">
        <aside className="settings-local-nav">
          <div className="settings-local-nav-card">
            <p className="eyebrow">Account</p>
            <strong>{meta.name || "Workspace user"}</strong>
            <span>{meta.email || "Loading..."}</span>
            <span>{meta.workspaceName || "Workspace"}</span>
          </div>

          <nav className="settings-local-nav-list" aria-label="Settings sections">
            <a href="#general" className="settings-local-link is-active">General</a>
            <a href="#password" className="settings-local-link">Password</a>
            <a href="#delete-account" className="settings-local-link">Account</a>
          </nav>
        </aside>

        <div className="settings-detail-stack">
          <Surface
            title="Profile"
            subtitle="Current account identity for this workspace."
            className="settings-section"
          >
            <div id="general" className="settings-form-grid">
              <div className="settings-field">
                <label>Name</label>
                <input value={meta.name} disabled />
              </div>
              <div className="settings-field">
                <label>Email</label>
                <input value={meta.email} disabled />
              </div>
              <div className="settings-field settings-field-full">
                <label>Workspace Name</label>
                <input value={meta.workspaceName} disabled />
              </div>
            </div>
          </Surface>

          <Surface
            title={meta.hasPassword ? "Password" : "Set Password"}
            subtitle={
              meta.hasPassword
                ? "Update the password used to sign in to this workspace."
                : "This account was created with a provider. Add a password for direct sign-in."
            }
            className="settings-section"
          >
            <form id="password" className="settings-form-grid" onSubmit={handlePasswordSave}>
              {meta.hasPassword ? (
                <div className="settings-field settings-field-full">
                  <label htmlFor="current-password">Current password</label>
                  <input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
                    disabled={loading || savingPassword}
                  />
                </div>
              ) : null}

              <div className="settings-field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                  disabled={loading || savingPassword}
                />
              </div>

              <div className="settings-field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
                  disabled={loading || savingPassword}
                />
              </div>

              <div className="settings-actions-bar settings-field-full">
                <button className="button" type="submit" disabled={loading || savingPassword}>
                  {savingPassword ? "Saving..." : meta.hasPassword ? "Update Password" : "Set Password"}
                </button>
              </div>
            </form>
          </Surface>

          <Surface
            title="Delete Account"
            subtitle="This permanently removes your workspace, sprints, reports, stories, insights, and access."
            className="settings-section danger-zone"
          >
            <form id="delete-account" className="settings-form-grid" onSubmit={handleDeleteAccount}>
              <div className="settings-field settings-field-full">
                <label htmlFor="delete-confirmation">Type DELETE to confirm</label>
                <input
                  id="delete-confirmation"
                  value={deleteForm.confirmation}
                  onChange={(event) => updateDeleteField("confirmation", event.target.value.toUpperCase())}
                  placeholder="DELETE"
                  disabled={loading || deletingAccount}
                />
              </div>

              {meta.hasPassword ? (
                <div className="settings-field settings-field-full">
                  <label htmlFor="delete-password">Password</label>
                  <input
                    id="delete-password"
                    type="password"
                    value={deleteForm.password}
                    onChange={(event) => updateDeleteField("password", event.target.value)}
                    disabled={loading || deletingAccount}
                  />
                </div>
              ) : null}

              <div className="settings-actions-bar settings-field-full">
                <button className="danger-button" type="submit" disabled={loading || deletingAccount}>
                  {deletingAccount ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </form>
          </Surface>
        </div>
      </section>
    </AppShell>
  );
}
