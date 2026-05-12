import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell requireAuth={false}>
      <main className="report-layout">
        <section className="surface">
          <p className="eyebrow">Page Not Found</p>
          <h2>That page does not exist.</h2>
          <p className="page-description">
            The route may have moved, or the report link may no longer be valid.
          </p>
          <div className="page-actions">
            <Link href="/app" className="button">
              Return to Dashboard
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
