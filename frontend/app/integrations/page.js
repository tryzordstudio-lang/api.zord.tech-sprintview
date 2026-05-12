"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/ui";
import { apiGet } from "@/lib/api";

function JiraBrandLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className="integration-brand-icon" aria-hidden="true">
      <path fill="#fff" d="M0 24C0 10.745 10.745 0 24 0s24 10.745 24 24-10.745 24-24 24S0 37.255 0 24Z" />
      <path fill="#2684FF" d="M34.937 12H23.41a5.203 5.203 0 0 0 5.203 5.203h2.124v2.05a5.203 5.203 0 0 0 5.2 5.2V13a1 1 0 0 0-1-1Z" />
      <path fill="url(#jira-chip-a)" d="M29.233 17.743H17.707a5.203 5.203 0 0 0 5.2 5.2h2.123V25a5.203 5.203 0 0 0 5.203 5.197V18.743a1 1 0 0 0-1-1Z" />
      <path fill="url(#jira-chip-b)" d="M23.527 23.483H12a5.203 5.203 0 0 0 5.203 5.204h2.13v2.05a5.203 5.203 0 0 0 5.194 5.2V24.483a1 1 0 0 0-1-1Z" />
      <defs>
        <linearGradient id="jira-chip-a" x1="27.443" x2="22.57" y1="15.326" y2="20.411" gradientUnits="userSpaceOnUse">
          <stop offset=".18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient id="jira-chip-b" x1="376.829" x2="167.455" y1="349.939" y2="557.146" gradientUnits="userSpaceOnUse">
          <stop offset=".18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState({ connected: false, siteName: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await apiGet("/jira/status");
        if (!active) return;
        setStatus(data || { connected: false, siteName: null });
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Unable to load Jira integration status.");
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

  async function handleConnect() {
    const result = await apiGet("/jira/connect");
    if (result?.authUrl) {
      window.location.href = result.authUrl;
    }
  }

  return (
    <AppShell>
      <PageIntro
        eyebrow="Connected Systems"
        title="Integrations"
        description="Structured, step-driven Jira onboarding with minimal friction and clear operational status."
      />

      {error ? <div className="auth-alert">{error}</div> : null}

      <section className="integration-brand-bar">
        <div className="integration-brand-chip">
          <div className="integration-brand-copy">
            <JiraBrandLogo />
            <div>
              <strong>Jira</strong>
              <span>{status.connected ? `Connected to ${status.siteName || "Atlassian"}` : "Primary sprint import source"}</span>
            </div>
          </div>
          <button
            className={`integration-action ${status.connected ? "is-connected" : ""}`}
            type="button"
            disabled={status.connected || loading}
            onClick={handleConnect}
          >
            {loading ? "Checking..." : status.connected ? "Connected" : "Connect"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
