"use client";

import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

export default function AuditPage() {
  return (
    <RequireRoles anyOf={["AUDITOR", "SYS_ADMIN"]} title="Audit & Reports">
      <InternalPage title="Audit & Reports" pageId="AUDAUD">
        <p>Audit trails, immutable ledger views, and exports will be implemented here.</p>
      </InternalPage>
    </RequireRoles>
  );
}
