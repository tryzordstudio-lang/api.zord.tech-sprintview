import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { AuthPageGuard } from "@/components/auth-page-guard";

export function AuthShell({ eyebrow, title, description, children, footer }) {
  return (
    <AuthPageGuard>
      <div className="auth-layout">
        <section className="auth-panel auth-panel-brand">
          <Link href="/" className="auth-back-link">
            ← Back
          </Link>

          <div className="auth-brand-stage">
            <Link href="/app" className="auth-brand" aria-label="Zord SprintView dashboard">
              <BrandLogo className="auth-brand-mark" />
              <span className="auth-brand-copy">
                <strong>Zord SprintView</strong>
                <small>Sprint intelligence platform</small>
              </span>
            </Link>

            <div className="auth-hero-copy">
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>

            <div className="auth-hero-points">
              <div className="auth-point">
                <strong>AI-first visibility</strong>
                <span>Turn sprint activity into clean signals for engineering and stakeholders.</span>
              </div>
              <div className="auth-point">
                <strong>Operational clarity</strong>
                <span>Track health, delivery risk, and reports from one structured workspace.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel auth-panel-form">
          <div className="auth-card">
            {children}
            {footer ? <div className="auth-footer">{footer}</div> : null}
          </div>
        </section>
      </div>
    </AuthPageGuard>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  hint,
  hintTone = "default",
  defaultValue,
  value,
  onChange,
  autoComplete,
  required = true
}) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
      />
      {hint ? <small className={`auth-field-hint tone-${hintTone}`}>{hint}</small> : null}
    </label>
  );
}
