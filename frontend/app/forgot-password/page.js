import Link from "next/link";
import { AuthField, AuthShell } from "@/components/auth-shell";

export const metadata = {
  title: "Forgot Password | Zord SprintView"
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account Recovery"
      title="Forgot password"
      description="Request a secure password reset link for your Zord SprintView workspace account."
      footer={
        <p>
          Remembered your password? <Link href="/signin">Back to sign in</Link>
        </p>
      }
    >
      <div className="auth-card-header">
        <h2>Reset request</h2>
        <p>Enter your work email and we&apos;ll send a password reset link.</p>
      </div>

      <form className="auth-form">
        <AuthField label="Work email" type="email" placeholder="you@company.com" />
        <button className="button auth-submit" type="submit">
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
}
