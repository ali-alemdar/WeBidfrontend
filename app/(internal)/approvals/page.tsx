"use client";

import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

export default function ApprovalInboxPage() {
  return (
    <RequireRoles anyOf={["REQUISITION_MANAGER", "SYS_ADMIN"]} title="Approval Inbox">
      <InternalPage title="Approval Inbox">
      <p><strong>Page ID:</strong> EMP-AP01</p>
      <p>Items awaiting decision (approve/reject/comments).</p>
    </InternalPage>
    </RequireRoles>
  );
}
