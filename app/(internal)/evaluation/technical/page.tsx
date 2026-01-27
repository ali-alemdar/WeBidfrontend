"use client";

import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";

export default function TechnicalEvaluationFormPage() {
  return (
    <RequireRoles anyOf={["EVALUATOR", "COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Technical Evaluation">
      <InternalPage title="Technical Evaluation">
      <p><strong>Page ID:</strong> EMP-E02</p>
      <p>Criteria scoring, comments, and evidence upload will be implemented here.</p>
      </InternalPage>
    </RequireRoles>
  );
}
