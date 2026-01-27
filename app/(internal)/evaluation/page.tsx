"use client";

import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

export default function EvaluationPage() {
  return (
    <RequireRoles anyOf={["EVALUATOR", "COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Evaluation">
      <InternalPage title="Evaluation">
      <p><strong>Page ID:</strong> EMP-E01</p>
      <p>Technical/commercial evaluation dashboards and forms will be implemented here.</p>
      </InternalPage>
    </RequireRoles>
  );
}
