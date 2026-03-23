#!/bin/bash
BASE_URL="http://localhost:3100/api"
PASS=0; FAIL=0

# Colors
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'

pass() { echo -e "${GREEN}✓ PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗ FAIL${NC} $1"; echo "  Response: $2"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${BOLD}${YELLOW}=== $1 ===${NC}"; }

# ── Auth ──────────────────────────────────────────────────────────────────────
section "AUTH"
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken') or d.get('access_token',''))" 2>/dev/null)
USER_ID=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id','7992cbbc-c1c4-484b-ac48-9c4b5a230fcd'))" 2>/dev/null)
[ -n "$TOKEN" ] && pass "Login OK (user: $USER_ID)" || { fail "Login failed" "$LOGIN"; exit 1; }

H="-H \"Authorization: Bearer $TOKEN\" -H \"Content-Type: application/json\""
auth() { curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

# ── Chart of Accounts ─────────────────────────────────────────────────────────
section "CHART OF ACCOUNTS"
TS=$(date +%s)

# Create asset account
ACCT=$(auth -X POST "$BASE_URL/accounting/accounts" -d "{
  \"account_code\": \"1001-$TS\",
  \"account_name\": \"Test Cash Account\",
  \"account_type\": \"asset\",
  \"account_sub_type\": \"cash\",
  \"opening_balance\": 10000
}")
ACCT_ID=$(echo "$ACCT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$ACCT_ID" ] && pass "Create account (asset/cash)" || fail "Create account" "$ACCT"

# Create revenue account
REV=$(auth -X POST "$BASE_URL/accounting/accounts" -d "{
  \"account_code\": \"4001-$TS\",
  \"account_name\": \"Test Sales Revenue\",
  \"account_type\": \"revenue\",
  \"account_sub_type\": \"sales_revenue\"
}")
REV_ID=$(echo "$REV" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$REV_ID" ] && pass "Create account (revenue)" || fail "Create revenue account" "$REV"

# Create expense account
EXP=$(auth -X POST "$BASE_URL/accounting/accounts" -d "{
  \"account_code\": \"5001-$TS\",
  \"account_name\": \"Test Operating Expense\",
  \"account_type\": \"expense\",
  \"account_sub_type\": \"operating_expense\"
}")
EXP_ID=$(echo "$EXP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$EXP_ID" ] && pass "Create account (expense)" || fail "Create expense account" "$EXP"

# List accounts
LIST=$(auth "$BASE_URL/accounting/accounts")
COUNT=$(echo "$LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
[ "$COUNT" -gt 0 ] && pass "List accounts ($COUNT total)" || fail "List accounts" "$LIST"

# Get single account
GET=$(auth "$BASE_URL/accounting/accounts/$ACCT_ID")
GOT_ID=$(echo "$GET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ "$GOT_ID" = "$ACCT_ID" ] && pass "Get account by ID" || fail "Get account" "$GET"

# Update account
UPD=$(auth -X PUT "$BASE_URL/accounting/accounts/$ACCT_ID" -d '{"account_name":"Updated Cash Account","description":"Updated desc"}')
UPD_NAME=$(echo "$UPD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('account_name',''))" 2>/dev/null)
[ "$UPD_NAME" = "Updated Cash Account" ] && pass "Update account" || fail "Update account" "$UPD"

# Duplicate account code → 409
DUP=$(auth -X POST "$BASE_URL/accounting/accounts" -d "{
  \"account_code\": \"1001-$TS\",
  \"account_name\": \"Duplicate\",
  \"account_type\": \"asset\",
  \"account_sub_type\": \"cash\"
}")
DUP_CODE=$(echo "$DUP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$DUP_CODE" = "409" ] && pass "Duplicate account code → 409" || fail "Duplicate check" "$DUP"

# ── Journal Entries ───────────────────────────────────────────────────────────
section "JOURNAL ENTRIES"

# Create journal entry (debit cash, credit revenue — balanced)
JE=$(auth -X POST "$BASE_URL/accounting/journal-entries" -d "{
  \"entry_date\": \"2026-03-19\",
  \"entry_type\": \"general\",
  \"description\": \"Test journal entry\",
  \"reference\": \"REF-$TS\",
  \"created_by\": \"$USER_ID\",
  \"lines\": [
    {\"account_id\": \"$ACCT_ID\", \"description\": \"Cash in\", \"debit\": 500, \"credit\": 0},
    {\"account_id\": \"$REV_ID\",  \"description\": \"Revenue\", \"debit\": 0,   \"credit\": 500}
  ]
}")
JE_ID=$(echo "$JE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
JE_NUM=$(echo "$JE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('entry_number',''))" 2>/dev/null)
[ -n "$JE_ID" ] && pass "Create journal entry ($JE_NUM)" || fail "Create journal entry" "$JE"

# Unbalanced entry → 400
UNBAL=$(auth -X POST "$BASE_URL/accounting/journal-entries" -d "{
  \"entry_date\": \"2026-03-19\",
  \"lines\": [
    {\"account_id\": \"$ACCT_ID\", \"debit\": 100, \"credit\": 0},
    {\"account_id\": \"$REV_ID\",  \"debit\": 0,   \"credit\": 200}
  ]
}")
UNBAL_CODE=$(echo "$UNBAL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$UNBAL_CODE" = "400" ] && pass "Unbalanced entry → 400" || fail "Unbalanced validation" "$UNBAL"

# List journal entries
JE_LIST=$(auth "$BASE_URL/accounting/journal-entries")
JE_COUNT=$(echo "$JE_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
[ "$JE_COUNT" -gt 0 ] && pass "List journal entries ($JE_COUNT total)" || fail "List journal entries" "$JE_LIST"

# Get single journal entry
JE_GET=$(auth "$BASE_URL/accounting/journal-entries/$JE_ID")
JE_GOT=$(echo "$JE_GET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ "$JE_GOT" = "$JE_ID" ] && pass "Get journal entry by ID" || fail "Get journal entry" "$JE_GET"

# Post journal entry
POST_JE=$(auth -X POST "$BASE_URL/accounting/journal-entries/$JE_ID/post" -d "{\"posted_by\": \"$USER_ID\"}")
POST_STATUS=$(echo "$POST_JE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$POST_STATUS" = "posted" ] && pass "Post journal entry" || fail "Post journal entry" "$POST_JE"

# Post already-posted → 400
POST2=$(auth -X POST "$BASE_URL/accounting/journal-entries/$JE_ID/post" -d "{\"posted_by\": \"$USER_ID\"}")
POST2_CODE=$(echo "$POST2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$POST2_CODE" = "400" ] && pass "Re-post already posted → 400" || fail "Re-post check" "$POST2"

# Reverse journal entry
REV_JE=$(auth -X POST "$BASE_URL/accounting/journal-entries/$JE_ID/reverse" -d "{
  \"reversal_date\": \"2026-03-20\",
  \"reversed_by\": \"$USER_ID\",
  \"reason\": \"Test reversal\"
}")
REV_JE_ID=$(echo "$REV_JE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$REV_JE_ID" ] && pass "Reverse journal entry (new ID: ${REV_JE_ID:0:8}...)" || fail "Reverse journal entry" "$REV_JE"

# ── Bank Accounts ─────────────────────────────────────────────────────────────
section "BANK ACCOUNTS"

BANK=$(auth -X POST "$BASE_URL/accounting/bank-accounts" -d "{
  \"account_name\": \"Test Checking Account\",
  \"account_number\": \"ACC-$TS\",
  \"bank_name\": \"Test Bank\",
  \"branch\": \"Main Branch\",
  \"currency\": \"USD\",
  \"opening_balance\": 50000
}")
BANK_ID=$(echo "$BANK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$BANK_ID" ] && pass "Create bank account" || fail "Create bank account" "$BANK"

# Duplicate account number → 409
DUP_BANK=$(auth -X POST "$BASE_URL/accounting/bank-accounts" -d "{
  \"account_name\": \"Duplicate Bank\",
  \"account_number\": \"ACC-$TS\",
  \"bank_name\": \"Test Bank\"
}")
DUP_BANK_CODE=$(echo "$DUP_BANK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$DUP_BANK_CODE" = "409" ] && pass "Duplicate bank account number → 409" || fail "Duplicate bank check" "$DUP_BANK"

# List bank accounts
BANK_LIST=$(auth "$BASE_URL/accounting/bank-accounts")
BANK_COUNT=$(echo "$BANK_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
[ "$BANK_COUNT" -gt 0 ] && pass "List bank accounts ($BANK_COUNT total)" || fail "List bank accounts" "$BANK_LIST"

# Get bank account
BANK_GET=$(auth "$BASE_URL/accounting/bank-accounts/$BANK_ID")
BANK_GOT=$(echo "$BANK_GET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ "$BANK_GOT" = "$BANK_ID" ] && pass "Get bank account by ID" || fail "Get bank account" "$BANK_GET"

# Update bank account
BANK_UPD=$(auth -X PUT "$BASE_URL/accounting/bank-accounts/$BANK_ID" -d '{"account_name":"Updated Checking","branch":"Downtown Branch"}')
BANK_UPD_NAME=$(echo "$BANK_UPD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('account_name',''))" 2>/dev/null)
[ "$BANK_UPD_NAME" = "Updated Checking" ] && pass "Update bank account" || fail "Update bank account" "$BANK_UPD"

# ── Payments ──────────────────────────────────────────────────────────────────
section "PAYMENTS"

PAY=$(auth -X POST "$BASE_URL/accounting/payments" -d "{
  \"payment_type\": \"receipt\",
  \"payment_date\": \"2026-03-19\",
  \"amount\": 1500,
  \"payment_method\": \"bank_transfer\",
  \"bank_account_id\": \"$BANK_ID\",
  \"description\": \"Test payment\",
  \"reference\": \"PAY-REF-$TS\"
}")
PAY_ID=$(echo "$PAY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
PAY_NUM=$(echo "$PAY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('payment_number',''))" 2>/dev/null)
[ -n "$PAY_ID" ] && pass "Create payment ($PAY_NUM)" || fail "Create payment" "$PAY"

# List payments
PAY_LIST=$(auth "$BASE_URL/accounting/payments")
PAY_COUNT=$(echo "$PAY_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
[ "$PAY_COUNT" -gt 0 ] && pass "List payments ($PAY_COUNT total)" || fail "List payments" "$PAY_LIST"

# Get payment
PAY_GET=$(auth "$BASE_URL/accounting/payments/$PAY_ID")
PAY_GOT=$(echo "$PAY_GET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ "$PAY_GOT" = "$PAY_ID" ] && pass "Get payment by ID" || fail "Get payment" "$PAY_GET"

# ── Accounts Receivable ───────────────────────────────────────────────────────
section "ACCOUNTS RECEIVABLE"

# Need a customer — use admin user ID as fallback
CUST_ID="$USER_ID"

AR=$(auth -X POST "$BASE_URL/accounting/accounts-receivable" -d "{
  \"customer_id\": \"$CUST_ID\",
  \"invoice_number\": \"INV-$TS\",
  \"invoice_date\": \"2026-03-01\",
  \"due_date\": \"2026-03-31\",
  \"amount\": 3000,
  \"description\": \"Test invoice\"
}")
AR_ID=$(echo "$AR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$AR_ID" ] && pass "Create AR invoice" || fail "Create AR" "$AR"

# Duplicate invoice number → 409
DUP_AR=$(auth -X POST "$BASE_URL/accounting/accounts-receivable" -d "{
  \"customer_id\": \"$CUST_ID\",
  \"invoice_number\": \"INV-$TS\",
  \"invoice_date\": \"2026-03-01\",
  \"due_date\": \"2026-03-31\",
  \"amount\": 1000
}")
DUP_AR_CODE=$(echo "$DUP_AR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$DUP_AR_CODE" = "409" ] && pass "Duplicate invoice number → 409" || fail "Duplicate AR check" "$DUP_AR"

# List AR
AR_LIST=$(auth "$BASE_URL/accounting/accounts-receivable")
AR_COUNT=$(echo "$AR_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
[ "$AR_COUNT" -gt 0 ] && pass "List AR ($AR_COUNT total)" || fail "List AR" "$AR_LIST"

# Get AR
AR_GET=$(auth "$BASE_URL/accounting/accounts-receivable/$AR_ID")
AR_GOT=$(echo "$AR_GET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ "$AR_GOT" = "$AR_ID" ] && pass "Get AR by ID" || fail "Get AR" "$AR_GET"

# Record partial payment
AR_PAY=$(auth -X POST "$BASE_URL/accounting/accounts-receivable/$AR_ID/payment" -d "{
  \"payment_amount\": 1000,
  \"payment_date\": \"2026-03-15\",
  \"payment_method\": \"bank_transfer\"
}")
AR_STATUS=$(echo "$AR_PAY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$AR_STATUS" = "partially_paid" ] && pass "Record partial AR payment → partially_paid" || fail "AR partial payment" "$AR_PAY"

# Record full payment
AR_PAY2=$(auth -X POST "$BASE_URL/accounting/accounts-receivable/$AR_ID/payment" -d "{
  \"payment_amount\": 2000,
  \"payment_date\": \"2026-03-20\",
  \"payment_method\": \"cash\"
}")
AR_STATUS2=$(echo "$AR_PAY2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$AR_STATUS2" = "paid" ] && pass "Record full AR payment → paid" || fail "AR full payment" "$AR_PAY2"

# Overpayment → 400
AR_OVER=$(auth -X POST "$BASE_URL/accounting/accounts-receivable/$AR_ID/payment" -d "{
  \"payment_amount\": 999,
  \"payment_date\": \"2026-03-21\",
  \"payment_method\": \"cash\"
}")
AR_OVER_CODE=$(echo "$AR_OVER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$AR_OVER_CODE" = "400" ] && pass "AR overpayment → 400" || fail "AR overpayment check" "$AR_OVER"

# ── Accounts Payable ──────────────────────────────────────────────────────────
section "ACCOUNTS PAYABLE"

SUPP_ID="$USER_ID"

AP=$(auth -X POST "$BASE_URL/accounting/accounts-payable" -d "{
  \"supplier_id\": \"$SUPP_ID\",
  \"bill_number\": \"BILL-$TS\",
  \"bill_date\": \"2026-03-01\",
  \"due_date\": \"2026-03-31\",
  \"amount\": 2000,
  \"description\": \"Test bill\"
}")
AP_ID=$(echo "$AP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$AP_ID" ] && pass "Create AP bill" || fail "Create AP" "$AP"

# Duplicate bill number → 409
DUP_AP=$(auth -X POST "$BASE_URL/accounting/accounts-payable" -d "{
  \"supplier_id\": \"$SUPP_ID\",
  \"bill_number\": \"BILL-$TS\",
  \"bill_date\": \"2026-03-01\",
  \"due_date\": \"2026-03-31\",
  \"amount\": 500
}")
DUP_AP_CODE=$(echo "$DUP_AP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$DUP_AP_CODE" = "409" ] && pass "Duplicate bill number → 409" || fail "Duplicate AP check" "$DUP_AP"

# List AP
AP_LIST=$(auth "$BASE_URL/accounting/accounts-payable")
AP_COUNT=$(echo "$AP_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
[ "$AP_COUNT" -gt 0 ] && pass "List AP ($AP_COUNT total)" || fail "List AP" "$AP_LIST"

# Get AP
AP_GET=$(auth "$BASE_URL/accounting/accounts-payable/$AP_ID")
AP_GOT=$(echo "$AP_GET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ "$AP_GOT" = "$AP_ID" ] && pass "Get AP by ID" || fail "Get AP" "$AP_GET"

# Record partial AP payment
AP_PAY=$(auth -X POST "$BASE_URL/accounting/accounts-payable/$AP_ID/payment" -d "{
  \"payment_amount\": 800,
  \"payment_date\": \"2026-03-15\",
  \"payment_method\": \"bank_transfer\"
}")
AP_STATUS=$(echo "$AP_PAY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$AP_STATUS" = "partially_paid" ] && pass "Record partial AP payment → partially_paid" || fail "AP partial payment" "$AP_PAY"

# Record full AP payment
AP_PAY2=$(auth -X POST "$BASE_URL/accounting/accounts-payable/$AP_ID/payment" -d "{
  \"payment_amount\": 1200,
  \"payment_date\": \"2026-03-20\",
  \"payment_method\": \"cash\"
}")
AP_STATUS2=$(echo "$AP_PAY2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$AP_STATUS2" = "paid" ] && pass "Record full AP payment → paid" || fail "AP full payment" "$AP_PAY2"

# AP overpayment → 400
AP_OVER=$(auth -X POST "$BASE_URL/accounting/accounts-payable/$AP_ID/payment" -d "{
  \"payment_amount\": 1,
  \"payment_date\": \"2026-03-21\",
  \"payment_method\": \"cash\"
}")
AP_OVER_CODE=$(echo "$AP_OVER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$AP_OVER_CODE" = "400" ] && pass "AP overpayment → 400" || fail "AP overpayment check" "$AP_OVER"

# ── Reports ───────────────────────────────────────────────────────────────────
section "REPORTS"

TB=$(auth "$BASE_URL/accounting/reports/trial-balance")
TB_OK=$(echo "$TB" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'accounts' in d else 'fail')" 2>/dev/null)
[ "$TB_OK" = "ok" ] && pass "Trial balance report" || fail "Trial balance" "$TB"

BS=$(auth "$BASE_URL/accounting/reports/balance-sheet")
BS_OK=$(echo "$BS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'assets' in d else 'fail')" 2>/dev/null)
[ "$BS_OK" = "ok" ] && pass "Balance sheet report" || fail "Balance sheet" "$BS"

PL=$(auth "$BASE_URL/accounting/reports/profit-and-loss?start_date=2026-01-01&end_date=2026-12-31")
PL_OK=$(echo "$PL" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'revenue' in d else 'fail')" 2>/dev/null)
[ "$PL_OK" = "ok" ] && pass "Profit & loss report" || fail "Profit & loss" "$PL"

# ── Delete account (no transactions) ─────────────────────────────────────────
section "DELETE"

# Create a fresh account with no transactions to delete
DEL_ACCT=$(auth -X POST "$BASE_URL/accounting/accounts" -d "{
  \"account_code\": \"9999-$TS\",
  \"account_name\": \"Delete Me\",
  \"account_type\": \"expense\",
  \"account_sub_type\": \"operating_expense\"
}")
DEL_ID=$(echo "$DEL_ACCT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
DEL=$(auth -X DELETE "$BASE_URL/accounting/accounts/$DEL_ID")
DEL_CODE=$(echo "$DEL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('statusCode','ok'))" 2>/dev/null)
[ "$DEL_CODE" = "ok" ] || [ -z "$DEL" ] && pass "Delete account (no transactions)" || fail "Delete account" "$DEL"

# Delete account with transactions → 400
DEL_USED=$(auth -X DELETE "$BASE_URL/accounting/accounts/$ACCT_ID")
DEL_USED_CODE=$(echo "$DEL_USED" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$DEL_USED_CODE" = "400" ] && pass "Delete account with transactions → 400" || fail "Delete used account check" "$DEL_USED"

# 404 on non-existent
NOT_FOUND=$(auth "$BASE_URL/accounting/accounts/00000000-0000-0000-0000-000000000000")
NF_CODE=$(echo "$NOT_FOUND" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[ "$NF_CODE" = "404" ] && pass "Non-existent account → 404" || fail "404 check" "$NOT_FOUND"

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
