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
      "EVALUATOR",
      "AWARD_AUTHORITY",
      "AUDITOR",
      "SYS_ADMIN",
    ],
  },
  {
    label: "Requisitions",
    path: "/employee/requisitions",
    roles: ["REQUESTER", "SYS_ADMIN"],
  },
  {
    label: "Tenders",
    path: "/employee/tenders/builder",
    roles: ["PROCUREMENT", "SYS_ADMIN"],
  },
  {
    label: "Approvals",
    path: "/employee/approvals",
    roles: ["SYS_ADMIN"],
  },
  {
    label: "Committee",
    path: "/employee/committee/setup",
    roles: ["SYS_ADMIN"],
  },
  {
    label: "Evaluation",
    path: "/employee/evaluation/technical",
    roles: ["EVALUATOR", "SYS_ADMIN"],
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
