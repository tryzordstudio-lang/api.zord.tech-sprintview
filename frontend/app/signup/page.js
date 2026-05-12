import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { EmailSignUpForm } from "@/components/auth-forms";

export const metadata = {
  title: "Sign Up | Zord SprintView"
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Team Onboarding"
      title="Create your workspace account"
      description="Start importing sprints, generating intelligence, and publishing reports with a structured setup flow."
      footer={
        <p>
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      }
    >
      <div className="auth-card-header">
        <h2>Create account</h2>
        <p>Set up a workspace owner profile to start onboarding your team.</p>
      </div>
      <EmailSignUpForm />
    </AuthShell>
  );
}
