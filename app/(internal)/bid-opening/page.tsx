"use client";

import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

export default function BidOpeningPage() {
  return (
    <RequireRoles anyOf={["COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Bid Opening">
      <InternalPage title="Bid Opening">
      <p><strong>Page ID:</strong> EMP-O01 / EMP-O02</p>
      <p>Technical/commercial bid opening workflows will be implemented here.</p>
      </InternalPage>
    </RequireRoles>
  );
}
