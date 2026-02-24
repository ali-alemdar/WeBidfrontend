import NotesPanel from "./NotesPanel";

interface Props {
  requisitionId: number;
  refreshTrigger?: number;
}

/**
 * Team notes panel for requisitions.
 * This is a convenience wrapper around the generic NotesPanel component.
 */
export default function TeamNotesPanel({ requisitionId, refreshTrigger }: Props) {
  return (
    <NotesPanel
      notesEndpoint={`/requisitions/${requisitionId}/notes`}
      statusEndpoint={`/requisitions/${requisitionId}`}
      refreshTrigger={refreshTrigger}
    />
  );
}
