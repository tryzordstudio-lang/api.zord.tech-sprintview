import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function HomePage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link href="/" className="landing-brand" aria-label="Zord SprintView home">
          <BrandLogo className="landing-brand-mark" />
          <span className="landing-brand-copy">
            <strong>Zord SprintView</strong>
            <small>Sprint intelligence platform</small>
          </span>
        </Link>

        <nav className="landing-nav" aria-label="Landing navigation">
          <Link href="/signin" className="landing-nav-link">
            Sign in
          </Link>
          <Link href="/signup" className="button">
            Get started
          </Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="eyebrow">AI Sprint Intelligence</p>
            <h1>See sprint health, delivery risk, and executive-ready reporting in one place.</h1>
            <p className="landing-description">
              Zord SprintView turns Jira delivery signals into clear operational visibility for engineering teams and
              stakeholders without becoming another project management tool.
            </p>

            <div className="landing-actions">
              <Link href="/signup" className="button">
                Start free
              </Link>
              <Link href="/signin" className="button-secondary">
                Sign in
              </Link>
            </div>
          </div>

          <div className="landing-preview">
            <div className="landing-preview-card">
              <div className="landing-preview-head">
                <span>Current Sprint</span>
                <strong>Health 82</strong>
              </div>
              <div className="landing-metric-grid">
                <article>
                  <span>Completion</span>
                  <strong>74%</strong>
                </article>
                <article>
                  <span>Blockers</span>
                  <strong>4</strong>
                </article>
                <article>
                  <span>Pending</span>
                  <strong>11</strong>
                </article>
              </div>
              <div className="landing-insight-strip">
                <strong>AI Insight</strong>
                <p>Backend validation is the only material delivery risk across the current sprint.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-feature-grid">
          <article className="landing-feature">
            <strong>Import from Jira</strong>
            <p>Connect boards, select a sprint, and pull delivery data into a clean reporting workflow.</p>
          </article>
          <article className="landing-feature">
            <strong>AI-generated insights</strong>
            <p>Highlight blockers, workload imbalance, and confidence gaps without manual analysis.</p>
          </article>
          <article className="landing-feature">
            <strong>Stakeholder-ready reports</strong>
            <p>Generate public links and PDF summaries that are structured for leadership review.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
