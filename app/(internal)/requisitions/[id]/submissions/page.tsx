"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";

interface Props {
  params: { id: string };
}

export default function RequisitionSubmissionsRedirectPage({ params }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/submissions/${params.id}`);
  }, [params.id, router]);

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDERING_OFFICER", "APPROVER", "REQUISITION_COMMITTEE", "COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Submissions">
      <InternalPage title="Redirecting…">
        <p>Redirecting…</p>
      </InternalPage>
    </RequireRoles>
  );
}
