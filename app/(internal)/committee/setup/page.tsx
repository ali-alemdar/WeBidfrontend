"use client";

import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";

export default function CommitteeSetupPage() {
  return (
    <RequireRoles anyOf={["COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Committee Setup">
      <InternalPage title="Committee Setup">
      <p><strong>Page ID:</strong> EMP-C01</p>
      <p>Define evaluation committees (members, roles, COI declarations).</p>
      </InternalPage>
    </RequireRoles>
  );
}
