"use client";

import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

export default function ContractsPage() {
  return (
    <RequireRoles anyOf={["AWARD_AUTHORITY", "SYS_ADMIN"]} title="Contract Workspace">
      <InternalPage title="Contract Workspace">
      <p><strong>Page ID:</strong> EMP-CT01</p>
      <p>Drafting, versioning, and signature tracking will be implemented here.</p>
    </InternalPage>
    </RequireRoles>
  );
}
