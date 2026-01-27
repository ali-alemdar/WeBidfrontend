#!/bin/bash

BASE="/home/ali/e-bidding/frontend/app"
LIB="$BASE/lib"

mkdir -p "$LIB"

#################################
# roles.ts
#################################
cat <<EOF > "$LIB/roles.ts"
export type Role =
  | "BIDDER_ADMIN"
  | "BIDDER_USER"
  | "BIDDER_FINANCE"
  | "REQUESTER"
  | "PROCUREMENT"
  | "APPROVER"
  | "COMMITTEE"
  | "EVALUATOR"
  | "AWARD_AUTHORITY"
  | "AUDITOR"
  | "SYS_ADMIN";
EOF

#################################
# auth.ts (mock auth provider)
#################################
cat <<EOF > "$LIB/auth.ts"
import { Role } from "./roles";

export interface User {
  id: string;
  name: string;
  roles: Role[];
}

/**
 * MOCK authentication context
 * Replace later with JWT/session-based auth
 */
export function getCurrentUser(): User | null {
  return {
    id: "demo-user",
    name: "Demo User",
    roles: ["PROCUREMENT"], // <-- change to test access
  };
}
EOF

#################################
# requireRole.tsx
#################################
cat <<EOF > "$LIB/requireRole.tsx"
import { Role } from "./roles";
import { getCurrentUser } from "./auth";

interface Props {
  allowed: Role[];
  children: React.ReactNode;
}

export default function RequireRole({ allowed, children }: Props) {
  const user = getCurrentUser();

  if (!user) {
    return (
      <main style={{ padding: "2rem", color: "red" }}>
        <h2>Access Denied</h2>
        <p>User is not authenticated.</p>
      </main>
    );
  }

  const hasAccess = user.roles.some(role => allowed.includes(role));

  if (!hasAccess) {
    return (
      <main style={{ padding: "2rem", color: "red" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </main>
    );
  }

  return <>{children}</>;
}
EOF

#################################
# Update Bidder Layout
#################################
cat <<EOF > "$BASE/bidder/layout.tsx"
import RequireRole from "../lib/requireRole";

export default function BidderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <header style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
          <h2>Bidder Portal</h2>
        </header>

        <RequireRole
          allowed={["BIDDER_ADMIN", "BIDDER_USER", "BIDDER_FINANCE"]}
        >
          {children}
        </RequireRole>
      </body>
    </html>
  );
}
EOF

#################################
# Update Employee Layout
#################################
cat <<EOF > "$BASE/employee/layout.tsx"
import RequireRole from "../lib/requireRole";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <header style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
          <h2>Employee Portal</h2>
        </header>

        <RequireRole
          allowed={[
            "REQUESTER",
            "PROCUREMENT",
            "APPROVER",
            "COMMITTEE",
            "EVALUATOR",
            "AWARD_AUTHORITY",
            "AUDITOR",
            "SYS_ADMIN",
          ]}
        >
          {children}
        </RequireRole>
      </body>
    </html>
  );
}
EOF

echo "✅ RBAC guards installed successfully"
