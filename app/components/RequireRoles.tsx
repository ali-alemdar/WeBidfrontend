"use client";

import { ReactNode } from "react";
import InternalPage from "./InternalPage";
import { getCurrentUser } from "../lib/authClient";

export default function RequireRoles({
  anyOf,
  title,
  children,
}: {
  anyOf: string[];
  title?: string;
  children: ReactNode;
}) {
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];

  const ok = anyOf.some((r) => roles.includes(r));

  if (!ok) {
    return (
      <InternalPage title={title || "Forbidden"}>
        <div style={{ color: "#b91c1c", fontWeight: 900, marginBottom: 8 }}>Access denied</div>
        <div style={{ color: "var(--muted)" }}>
          You do not have permission to view this page.
        </div>
      </InternalPage>
    );
  }

  return <>{children}</>;
}
