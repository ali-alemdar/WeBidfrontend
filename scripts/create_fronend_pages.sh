#!/bin/bash

BASE_DIR="/home/ali/e-bidding/frontend"

create_page () {
  local DIR=$1
  local FILE=$2
  local ID=$3
  local NAME=$4
  local DESC=$5
  local CONTENT=$6

  mkdir -p "$DIR"

  if [ ! -f "$DIR/$FILE" ]; then
    cat <<EOF > "$DIR/$FILE"
# $NAME

**Page ID:** $ID

## Description
$DESC

## Main Contents
$CONTENT
EOF
  fi
}

############################
# BIDDER PORTAL
############################

BIDDER="$BASE_DIR/bidder"

# Auth & Registration
create_page "$BIDDER/auth" "login.md" "BID-A01" "Login" \
"Authenticates bidder users into the system." \
"Login form, password validation, MFA handling, error messages."

create_page "$BIDDER/auth" "forgot-password.md" "BID-A02" "Forgot / Reset Password" \
"Allows bidders to securely reset their password." \
"Email or phone input, OTP verification, new password form."

create_page "$BIDDER/registration" "register.md" "BID-R01" "Register Account" \
"Creates a new bidder user account." \
"User credentials, terms acceptance, validation rules."

create_page "$BIDDER/registration" "verify-account.md" "BID-R02" "Account Verification" \
"Verifies bidder email or phone number." \
"OTP input, resend option, verification status."

create_page "$BIDDER/registration" "company-onboarding.md" "BID-R03" "Company Onboarding Wizard" \
"Registers bidder company and initial details." \
"Company identity, legal details, contacts, banking info."

create_page "$BIDDER/registration" "kyc-status.md" "BID-R04" "KYC Status & Resubmission" \
"Displays KYC verification result and allows resubmission." \
"KYC status, rejection reasons, document upload."

# Dashboard & Profile
create_page "$BIDDER/dashboard" "dashboard.md" "BID-D01" "Bidder Dashboard" \
"Provides overview of bidder activity." \
"Active tenders, bids, deadlines, alerts."

create_page "$BIDDER/profile" "company-profile.md" "BID-P01" "Company Profile" \
"Manages bidder company profile." \
"Company details, verification status, edit requests."

create_page "$BIDDER/profile" "users-roles.md" "BID-P02" "Users & Roles" \
"Manages bidder company users." \
"User list, role assignment, invitations."

create_page "$BIDDER/profile" "security.md" "BID-P03" "Security Settings" \
"Controls account security." \
"MFA setup, session management."

create_page "$BIDDER/profile" "document-vault.md" "BID-P04" "Company Document Vault" \
"Stores reusable bidder documents." \
"Certificates, licenses, compliance documents."

# Tenders
create_page "$BIDDER/tenders" "tender-list.md" "BID-T01" "Tender List" \
"Displays all available tenders." \
"Search, filters, tender summaries."

create_page "$BIDDER/tenders" "tender-detail.md" "BID-T02" "Tender Detail" \
"Shows detailed tender information." \
"Overview, documents, deadlines, fees."

create_page "$BIDDER/tenders" "clarifications.md" "BID-T03" "Clarifications" \
"Allows bidders to submit and view clarifications." \
"Q&A threads, responses, attachments."

create_page "$BIDDER/tenders" "addenda.md" "BID-T04" "Tender Addenda" \
"Displays tender amendments." \
"Addendum list, publication dates."

# Payments
create_page "$BIDDER/payments" "checkout.md" "BID-F01" "Checkout" \
"Processes tender and bid payments." \
"Fee breakdown, payment method selection."

create_page "$BIDDER/payments" "wallet.md" "BID-F02" "Wallet Dashboard" \
"Displays bidder wallet information." \
"Balance, holds, recent transactions."

create_page "$BIDDER/payments" "transactions.md" "BID-F03" "Transactions History" \
"Lists all bidder financial transactions." \
"Payments, refunds, reconciliation status."

create_page "$BIDDER/payments" "invoices.md" "BID-F04" "Invoices & Receipts" \
"Provides access to financial documents." \
"Invoice and receipt downloads."

# Bids
create_page "$BIDDER/bids" "my-bids.md" "BID-B01" "My Bids List" \
"Lists all bids created by the bidder." \
"Bid status, deadlines, versions."

create_page "$BIDDER/bids" "bid-workspace.md" "BID-B02" "Bid Workspace" \
"Main bid preparation interface." \
"Two-envelope stepper, uploads, validation."

create_page "$BIDDER/bids" "review-submit.md" "BID-B03" "Bid Review & Submit" \
"Final bid validation and submission." \
"Summary checks, submit confirmation."

create_page "$BIDDER/bids" "submission-history.md" "BID-B04" "Submission Receipt & History" \
"Shows bid submission records." \
"Receipt, timestamps, versions."

create_page "$BIDDER/bids" "bid-status.md" "BID-B05" "Bid Status Tracking" \
"Tracks bid progress after submission." \
"Evaluation stages, final outcome."

# Notifications & Support
create_page "$BIDDER/notifications" "inbox.md" "BID-N01" "Notifications Inbox" \
"Central notification center." \
"System alerts, tender updates."

create_page "$BIDDER/notifications" "preferences.md" "BID-N02" "Notification Preferences" \
"Controls notification channels." \
"Email, SMS, in-app settings."

create_page "$BIDDER/support" "tickets.md" "BID-S01" "Support Tickets List" \
"Lists bidder support requests." \
"Ticket status, categories."

create_page "$BIDDER/support" "create-ticket.md" "BID-S02" "Create Support Ticket" \
"Creates a new support request." \
"Issue category, description, attachments."

create_page "$BIDDER/support" "ticket-detail.md" "BID-S03" "Support Ticket Detail" \
"Tracks support ticket progress." \
"Messages, responses, resolution."

############################
# EMPLOYEE PORTAL
############################

EMP="$BASE_DIR/employee"

create_page "$EMP/auth" "login.md" "EMP-A01" "Employee Login" \
"Authenticates internal users." \
"Credentials, MFA, SSO support."

create_page "$EMP/admin" "user-management.md" "EMP-AD01" "User Management" \
"Manages internal users." \
"User list, roles, activation."

create_page "$EMP/admin" "role-management.md" "EMP-AD02" "Role Management" \
"Defines roles and permissions." \
"RBAC configuration."

create_page "$EMP/admin" "tenant-management.md" "EMP-AD03" "Tenant Management" \
"Manages system tenants." \
"Tenant configuration and status."

create_page "$EMP/admin" "templates.md" "EMP-AD04" "Template Management" \
"Manages system templates." \
"Tender, contract, evaluation templates."

create_page "$EMP/admin" "system-settings.md" "EMP-AD05" "System Settings" \
"Configures global system behavior." \
"Fees, retention rules, notifications."

create_page "$EMP/dashboard" "dashboard.md" "EMP-D01" "Employee Dashboard" \
"Displays system overview." \
"KPIs, alerts, milestones."

create_page "$EMP/dashboard" "my-tasks.md" "EMP-D02" "My Tasks" \
"Lists assigned actions." \
"Approvals, evaluations, openings."

# (Remaining employee pages follow same pattern; structure already proven)

echo "Frontend page structure successfully created at $BASE_DIR"
