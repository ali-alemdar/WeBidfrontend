export interface ProgressItem {
  id: string;
  title: string;
  status: "DONE" | "IN_PROGRESS" | "PENDING" | "LOCKED";
}

export const SYSTEM_PROGRESS: ProgressItem[] = [
  { id: "S1", title: "RBAC & Roles", status: "DONE" },
  { id: "S2", title: "JWT & Tenant Context", status: "DONE" },
  { id: "S3", title: "Audit Logging", status: "DONE" },
  { id: "S4", title: "Tender Lifecycle Rules", status: "DONE" },
  { id: "S5", title: "Contracts Frozen (Step 8)", status: "LOCKED" },
  { id: "S6", title: "Homepage & Global Styling", status: "IN_PROGRESS" },
  { id: "S7", title: "Auth UI", status: "PENDING" },
  { id: "S8", title: "Tender Read-Only Views", status: "PENDING" },
  { id: "S9", title: "Bid Submission Flow", status: "PENDING" },
];
