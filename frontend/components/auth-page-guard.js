"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingLogo } from "@/components/loading-logo";
import { apiGet } from "@/lib/api";

export function AuthPageGuard({ children }) {
  const router = useRouter();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        await apiGet("/users/me");
        if (!active) {
          return;
        }

        router.replace("/app");
        router.refresh();
      } catch (_error) {
        if (!active) {
          return;
        }

        setResolved(true);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  if (!resolved) {
    return (
      <main className="simple-loading-screen">
        <div className="brand-loading-stage">
          <LoadingLogo />
        </div>
      </main>
    );
  }

  return children;
}
