"use client";

import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";

export default function TechnicalOpeningSessionPage() {
  return (
    <RequireRoles anyOf={["COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Technical Opening Session">
      <InternalPage title="Technical Opening Session">
      <p><strong>Page ID:</strong> EMP-O01</p>
      <p>Conduct technical bid opening (open envelopes, generate minutes).</p>
    </InternalPage>
    </RequireRoles>
  );
}
