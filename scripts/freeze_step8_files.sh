#!/bin/bash
set -e

BASE="/home/ali/e-bidding/frontend/app/lib"

WARNING='/**
 * ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 *
 * This file is a frozen contract (RBAC / Lifecycle / Audit / API).
 * Changes to this file may break security, audit integrity,
 * or legal compliance of the e-bidding system.
 *
 * Modify ONLY after explicit confirmation from the lead developer.
 */
'

add_warning() {
  local FILE="$1"

  # Skip if file does not exist
  [ ! -f "$FILE" ] && return

  # Skip if warning already exists
  if grep -q "DO NOT MODIFY WITHOUT EXPLICIT APPROVAL" "$FILE"; then
    return
  fi

  echo "🔒 Freezing: $FILE"

  TMP=$(mktemp)
  echo "$WARNING" > "$TMP"
  cat "$FILE" >> "$TMP"
  mv "$TMP" "$FILE"
}

# Core contract files
add_warning "$BASE/roles.ts"
add_warning "$BASE/tenderLifecycle.ts"
add_warning "$BASE/tenderRules.ts"
add_warning "$BASE/auditTypes.ts"
add_warning "$BASE/useTenderGuard.ts"
add_warning "$BASE/requireRole.tsx"
add_warning "$BASE/apiClient.ts"

# All API contract files
for f in "$BASE/api/"*.api.ts; do
  add_warning "$f"
done

echo "✅ Step 8 files successfully marked as frozen contracts"
