#!/bin/bash

BASE="/home/ali/e-bidding/frontend/app"
LIB="$BASE/lib"

mkdir -p "$LIB"

#################################
# navigation.ts
#################################
cat <<EOF > "$LIB/navigation.ts"
import { Role } from "./roles";

export interface NavItem {
  label: string;
  path: string;
  roles: Role[];
  children?: NavItem[];
}

/* ============================
   BIDDER PORTAL NAVIGATION
   ============================ */
export const bidderNavigation: NavItem[] = [
  {
    label: "Dashboard",
    path: "/bidder/dashboard",
    roles: ["BIDDER_ADMIN", "BIDDER_USER", "BIDDER_FINANCE"],
  },
  {
    label: "Tenders",
    path: "/bidder/tenders",
    roles: ["BIDDER_ADMIN", "BIDDER_USER"],
  },
  {
    label: "My Bids",
    path: "/bidder/bids",
    roles: ["BIDDER_ADMIN", "BIDDER_USER"],
  },
  {
    label: "Payments",
    path: "/bidder/payments/wallet",
    roles: ["BIDDER_ADMIN", "BIDDER_FINANCE"],
  },
  {
    label: "Company Profile",
    path: "/bidder/profile/company-profile",
    roles: ["BIDDER_ADMIN"],
    children: [
      {
        label: "Users & Roles",
        path: "/bidder/profile/users-roles",
        roles: ["BIDDER_ADMIN"],
      },
    ],
  },
  {
    label: "Notifications",
    path: "/bidder/notifications",
    roles: ["BIDDER_ADMIN", "BIDDER_USER", "BIDDER_FINANCE"],
  },
  {
    label: "Support",
    path: "/bidder/support",
    roles: ["BIDDER_ADMIN", "BIDDER_USER"],
  },
];

/* ============================
   EMPLOYEE PORTAL NAVIGATION
   ============================ */
export const employeeNavigation: NavItem[] = [
  {
    label: "Dashboard",
    path: "/employee/dashboard",
    roles: [
      "REQUESTER",
      "PROCUREMENT",
      "APPROVER",
      "COMMITTEE",
      "EVALUATOR",
      "AWARD_AUTHORITY",
      "AUDITOR",
      "SYS_ADMIN",
    ],
  },
  {
    label: "Requisitions",
    path: "/employee/requisitions",
    roles: ["REQUESTER", "PROCUREMENT", "SYS_ADMIN"],
  },
  {
    label: "Tenders",
    path: "/employee/tenders/builder",
    roles: ["PROCUREMENT", "SYS_ADMIN"],
  },
  {
    label: "Approvals",
    path: "/employee/approvals",
    roles: ["APPROVER", "SYS_ADMIN"],
  },
  {
    label: "Committee",
    path: "/employee/committee/setup",
    roles: ["COMMITTEE", "SYS_ADMIN"],
  },
  {
    label: "Evaluation",
    path: "/employee/evaluation/technical",
    roles: ["EVALUATOR", "COMMITTEE", "SYS_ADMIN"],
  },
  {
    label: "Awards",
    path: "/employee/awards",
    roles: ["AWARD_AUTHORITY", "SYS_ADMIN"],
  },
  {
    label: "Contracts",
    path: "/employee/contracts",
    roles: ["AWARD_AUTHORITY", "SYS_ADMIN"],
  },
  {
    label: "Audit",
    path: "/employee/audit",
    roles: ["AUDITOR", "SYS_ADMIN"],
  },
  {
    label: "Admin",
    path: "/employee/admin/user-management",
    roles: ["SYS_ADMIN"],
  },
];
EOF

#################################
# NavigationMenu.tsx
#################################
cat <<EOF > "$LIB/NavigationMenu.tsx"
import Link from "next/link";
import { NavItem } from "./navigation";
import { getCurrentUser } from "./auth";

interface Props {
  items: NavItem[];
}

function hasAccess(rolesAllowed: string[], userRoles: string[]) {
  return userRoles.some(role => rolesAllowed.includes(role));
}

export default function NavigationMenu({ items }: Props) {
  const user = getCurrentUser();

  if (!user) return null;

  const renderItems = (navItems: NavItem[]) => {
    return navItems.map(item => {
      if (!hasAccess(item.roles, user.roles)) return null;

      return (
        <li key={item.path}>
          <Link href={item.path}>{item.label}</Link>
          {item.children && (
            <ul style={{ marginLeft: "1rem" }}>
              {renderItems(item.children)}
            </ul>
          )}
        </li>
      );
    });
  };

  return (
    <nav style={{ padding: "1rem", borderRight: "1px solid #ccc" }}>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {renderItems(items)}
      </ul>
    </nav>
  );
}
EOF

#################################
# Update Bidder Layout
#################################
cat <<EOF > "$BASE/bidder/layout.tsx"
import RequireRole from "../lib/requireRole";
import NavigationMenu from "../lib/NavigationMenu";
import { bidderNavigation } from "../lib/navigation";

export default function BidderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body style={{ display: "flex" }}>
        <NavigationMenu items={bidderNavigation} />

        <RequireRole
          allowed={["BIDDER_ADMIN", "BIDDER_USER", "BIDDER_FINANCE"]}
        >
          <main style={{ padding: "2rem", flex: 1 }}>
            <header style={{ marginBottom: "1rem" }}>
              <h2>Bidder Portal</h2>
            </header>
            {children}
          </main>
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
import NavigationMenu from "../lib/NavigationMenu";
import { employeeNavigation } from "../lib/navigation";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body style={{ display: "flex" }}>
        <NavigationMenu items={employeeNavigation} />

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
          <main style={{ padding: "2rem", flex: 1 }}>
            <header style={{ marginBottom: "1rem" }}>
              <h2>Employee Portal</h2>
            </header>
            {children}
          </main>
        </RequireRole>
      </body>
    </html>
  );
}
EOF

echo "✅ Role-aware navigation menus created successfully"
