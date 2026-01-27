#!/bin/bash

BASE="/home/ali/e-bidding/frontend/app"

create_page () {
  local DIR=$1
  local ID=$2
  local NAME=$3
  local DESC=$4
  local CONTENT=$5

  mkdir -p "$DIR"

  if [ ! -f "$DIR/page.tsx" ]; then
    cat <<EOF > "$DIR/page.tsx"
export default function Page() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>$NAME</h1>

      <p><strong>Page ID:</strong> $ID</p>

      <h2>Description</h2>
      <p>$DESC</p>

      <h2>Main Contents</h2>
      <p>$CONTENT</p>
    </main>
  );
}
EOF
  fi
}

create_layout () {
  local DIR=$1
  local TITLE=$2

  if [ ! -f "$DIR/layout.tsx" ]; then
    cat <<EOF > "$DIR/layout.tsx"
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <header style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
          <h2>$TITLE</h2>
        </header>
        {children}
      </body>
    </html>
  );
}
EOF
  fi
}

############################
# BIDDER PORTAL
############################

BID="$BASE/bidder"
create_layout "$BID" "Bidder Portal"

create_page "$BID/auth/login" "BID-A01" "Login" \
"Authenticates bidder users into the system." \
"Login form, password validation, MFA handling."

create_page "$BID/registration/register" "BID-R01" "Register Account" \
"Creates a new bidder account." \
"User credentials, terms acceptance."

create_page "$BID/registration/company-onboarding" "BID-R03" "Company Onboarding Wizard" \
"Registers bidder company." \
"Company identity, legal details, KYC."

create_page "$BID/dashboard" "BID-D01" "Bidder Dashboard" \
"Overview of bidder activity." \
"Active tenders, bids, alerts."

create_page "$BID/profile/company-profile" "BID-P01" "Company Profile" \
"Manages bidder company profile." \
"Company details, verification status."

create_page "$BID/profile/users-roles" "BID-P02" "Users & Roles" \
"Manages bidder users." \
"User list, invitations, roles."

create_page "$BID/tenders" "BID-T01" "Tender List" \
"Displays available tenders." \
"Search, filters, tender summaries."

create_page "$BID/tenders/detail" "BID-T02" "Tender Detail" \
"Shows tender information." \
"Overview, documents, deadlines."

create_page "$BID/bids" "BID-B01" "My Bids" \
"Lists bidder bids." \
"Bid status, deadlines."

create_page "$BID/bids/workspace" "BID-B02" "Bid Workspace" \
"Two-envelope bid preparation." \
"Technical and commercial envelopes."

create_page "$BID/payments/wallet" "BID-F02" "Wallet Dashboard" \
"Displays bidder wallet." \
"Balance, transactions."

create_page "$BID/notifications" "BID-N01" "Notifications Inbox" \
"Shows bidder notifications." \
"Tender alerts, system messages."

create_page "$BID/support" "BID-S01" "Support Tickets" \
"Lists support tickets." \
"Ticket status and history."

############################
# EMPLOYEE PORTAL
############################

EMP="$BASE/employee"
create_layout "$EMP" "Employee Portal"

create_page "$EMP/auth/login" "EMP-A01" "Employee Login" \
"Authenticates internal users." \
"Credentials, MFA, SSO."

create_page "$EMP/dashboard" "EMP-D01" "Employee Dashboard" \
"System overview." \
"KPIs, alerts, tasks."

create_page "$EMP/requisitions" "EMP-R01" "Requisition List" \
"Lists procurement requisitions." \
"Status, requester, dates."

create_page "$EMP/tenders/builder" "EMP-T02" "Tender Builder" \
"Authors tenders." \
"Rules, documents, evaluation model."

create_page "$EMP/approvals" "EMP-AP01" "Approval Inbox" \
"Pending approvals." \
"Approve, reject, comment."

create_page "$EMP/committee/setup" "EMP-C01" "Committee Setup" \
"Assigns committee members." \
"Roles, COI declarations."

create_page "$EMP/opening/technical" "EMP-O01" "Technical Opening Session" \
"Opens technical envelopes." \
"Bid list, opening minutes."

create_page "$EMP/evaluation/technical" "EMP-E02" "Technical Evaluation" \
"Scores technical bids." \
"Criteria scoring, comments."

create_page "$EMP/shortlist" "EMP-SL01" "Shortlist Builder" \
"Creates shortlist." \
"Ranking, thresholds."

create_page "$EMP/awards" "EMP-AW01" "Winner Selection" \
"Selects winning bidder." \
"Evaluation summary."

create_page "$EMP/contracts" "EMP-CT01" "Contract Workspace" \
"Manages contracts." \
"Templates, versions, signatures."

create_page "$EMP/audit" "EMP-AU01" "Audit Explorer" \
"Searches audit records." \
"Tender, bid, user filters."

echo "✅ Next.js App Router structure created successfully at $BASE"
