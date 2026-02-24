import NotesPanel from "./NotesPanel";

interface Props {
  tenderId: string;
  refreshTrigger?: number;
}

/**
 * Team notes panel for tenders.
 * This is a convenience wrapper around the generic NotesPanel component.
 */
export default function TenderNotesPanel({ tenderId, refreshTrigger }: Props) {
  return (
    <NotesPanel
      notesEndpoint={`/tenders/${tenderId}/notes`}
      statusEndpoint={`/tenders/${tenderId}`}
      refreshTrigger={refreshTrigger}
    />
  );
}
