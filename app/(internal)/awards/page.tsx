"use client";

import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

export default function AwardsPage() {
  return (
    <RequireRoles anyOf={["AWARD_AUTHORITY", "SYS_ADMIN"]} title="Awards & Contracts">
      <InternalPage title="Awards & Contracts">
      <p><strong>Page ID:</strong> EMP-AW01</p>
      <p>Winner selection and award routing will be implemented here.</p>
    </InternalPage>
    </RequireRoles>
  );
}
