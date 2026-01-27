/**
 * ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 *
 * This file is a frozen contract (RBAC / Lifecycle / Audit / API).
 * Changes to this file may break security, audit integrity,
 * or legal compliance of the e-bidding system.
 *
 * Modify ONLY after explicit confirmation from the lead developer.
 */

"use client";

import { useEffect, useRef } from "react";
import { Role } from "./roles";
import { getCurrentUser } from "./authClient";
import { logAuditEvent } from "./api/audit.api";

interface Props {
  allowed: Role[];
  children: React.ReactNode;
}

export default function RequireRole({ allowed, children }: Props) {
  const user = getCurrentUser();

  // Prevent duplicate audit logs on re-render
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!user && !loggedRef.current) {
      loggedRef.current = true;
      logAuditEvent({
        action: "ACCESS_DENIED",
        pageName: "Protected Route",
        metadata: {
          reason: "NOT_AUTHENTICATED",
        },
      }).catch(() => {});
    }

    if (
      user &&
      !user.roles.some((role) => allowed.includes(role)) &&
      !loggedRef.current
    ) {
      loggedRef.current = true;
      logAuditEvent({
        action: "ACCESS_DENIED",
        pageName: "Protected Route",
        metadata: {
          reason: "INSUFFICIENT_ROLE",
          requiredRoles: allowed,
          userRoles: user.roles,
        },
      }).catch(() => {});
    }
  }, [user, allowed]);

  if (!user) {
    return (
      <main style={{ padding: "2rem", color: "red" }}>
        <h2>Access Denied</h2>
        <p>User is not authenticated.</p>
      </main>
    );
  }

  const hasAccess = user.roles.some((role) => allowed.includes(role));

  if (!hasAccess) {
    return (
      <main style={{ padding: "2rem", color: "red" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
        <p>
          <strong>Your roles:</strong>{" "}
          {user.roles.length ? user.roles.join(", ") : "None"}
        </p>
        <p>
          <strong>Required roles:</strong> {allowed.join(", ")}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}