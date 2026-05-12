"use client";

import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/", label = "Back" }) {
  const router = useRouter();

  return (
    <button
      className="button-secondary public-back-button"
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}
