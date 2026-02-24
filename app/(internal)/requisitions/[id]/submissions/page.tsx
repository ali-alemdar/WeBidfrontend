"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { getCurrentUser } from "../../../../lib/authClient";

interface Props {
  params: { id: string };
}

export default function SubmissionsRedirectPage({ params }: Props) {
  const router = useRouter();

  // If not a manager, this component will render the submissions view
  // You'll need to import and render your actual submissions component here
  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDERING_OFFICER", "APPROVER", "REQUISITION_COMMITTEE", "COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Submissions">
      <InternalPage title="Loading…">
        <p>Loading submissions…</p>
        {/* TODO: Import and render your actual submissions component here */}
      </InternalPage>
    </RequireRoles>
  );
}