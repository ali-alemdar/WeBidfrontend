"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref,
  label = "Back",
  className = "btn",
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push(fallbackHref);
          }
        } catch {
          router.push(fallbackHref);
        }
      }}
    >
      {label}
    </button>
  );
}
