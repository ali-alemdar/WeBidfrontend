"use client";

import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

export default function ShortlistPage() {
  return (
    <RequireRoles anyOf={["EVALUATOR", "COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Shortlist Builder">
      <InternalPage title="Shortlist Builder">
      <p><strong>Page ID:</strong> EMP-SL01</p>
      <p>Ranking, thresholds, and shortlist approval/export will be implemented here.</p>
      </InternalPage>
    </RequireRoles>
  );
}
