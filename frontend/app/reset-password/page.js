import Link from "next/link";
import { AuthField, AuthShell } from "@/components/auth-shell";

export const metadata = {
  title: "Reset Password | Zord SprintView"
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Secure Access"
      title="Reset password"
      description="Choose a new password to restore access to your sprint intelligence workspace."
      footer={
        <p>
          Return to <Link href="/signin">sign in</Link>
        </p>
      }
    >
      <div className="auth-card-header">
        <h2>Create new password</h2>
        <p>Use at least 12 characters with a mix of letters, numbers, and symbols.</p>
      </div>

      <form className="auth-form">
        <AuthField label="New password" type="password" placeholder="Enter a new password" />
        <AuthField label="Confirm password" type="password" placeholder="Re-enter your new password" />
        <button className="button auth-submit" type="submit">
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
