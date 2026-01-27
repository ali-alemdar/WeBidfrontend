"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../lib/api";

// Deprecated: legacy tender builder page kept only to avoid hard 404s.
// Redirect users to the main tenders list instead of using this flow.
export default function TenderBuilderPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tenders");
  }, [router]);

  return (
    <RequireRoles anyOf={["TENDERING_OFFICER", "SYS_ADMIN"]} title="Tender Builder">
      <InternalPage title="Tender Builder">
        <p>Redirecting to tenders list…</p>
      </InternalPage>
    </RequireRoles>
  );
}
