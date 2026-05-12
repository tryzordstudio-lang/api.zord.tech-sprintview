import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { EmailSignInForm } from "@/components/auth-forms";

export const metadata = {
  title: "Sign In | Zord SprintView"
};

export default async function SignInPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error;

  return (
    <AuthShell
      eyebrow="Workspace Access"
      title="Sign in"
      description="Access sprint intelligence, AI insights, and stakeholder reports from your workspace."
      footer={
        <p>
          New to Zord SprintView? <Link href="/signup">Create an account</Link>
        </p>
      }
    >
      <div className="auth-card-header">
        <h2>Welcome back</h2>
        <p>Use your workspace credentials to continue.</p>
      </div>

      {errorMessage ? (
        <div className="auth-alert" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <EmailSignInForm />
    </AuthShell>
  );
}
