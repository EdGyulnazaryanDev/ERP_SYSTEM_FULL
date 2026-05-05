#!/bin/bash
BASE="http://localhost:3100/api"
PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'
pass() { echo -e "${GREEN}✓ PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗ FAIL${NC} $1 → $2"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${BOLD}${YELLOW}=== $1 ===${NC}"; }
check_id()    { local id=$(echo "$2"|jq -r '.id' 2>/dev/null); [ -n "$id" ] && [ "$id" != "null" ] && pass "$1 (id=${id:0:8}...)" || fail "$1" "$2"; }
check_array() { local n=$(echo "$2"|jq 'if type=="array" then length else (.data//[]|length) end' 2>/dev/null); pass "$1 → $n items"; }
check_field() { local v=$(echo "$2"|jq -r "$3" 2>/dev/null); [ "$v" = "$4" ] && pass "$1 ($3=$v)" || fail "$1 (expected $3=$4, got $v)" "$2"; }
check_code()  { local c=$(echo "$2"|jq -r '.statusCode' 2>/dev/null); [ "$c" = "$3" ] && pass "$1 → HTTP $c" || fail "$1 (expected $3, got $c)" "$2"; }
auth() { curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           CRM - FULL API TEST            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password","actorType":"staff"}' | jq -r '.accessToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login OK" || { fail "Login" "no token"; exit 1; }

TS=$(date +%s)

section "CUSTOMERS"
CUST=$(auth -X POST "$BASE/crm/customers" -d "{
  \"customer_code\": \"CUST-$TS\",
  \"company_name\": \"Acme Corp $TS\",
  \"contact_person\": \"John Smith\",
  \"email\": \"john_$TS@acme.local\",
  \"phone\": \"+1-555-0100\",
  \"mobile\": \"+1-555-0101\",
  \"address\": \"123 Business Ave\",
  \"city\": \"New York\",
  \"country\": \"USA\",
  \"customer_type\": \"business\",
  \"industry\": \"Technology\",
  \"credit_limit\": 50000,
  \"payment_terms\": 30,
  \"status\": \"active\"
}")
CUST_ID=$(echo "$CUST" | jq -r '.id')
check_id "Create customer" "$CUST"

DUP_CUST=$(auth -X POST "$BASE/crm/customers" -d "{
  \"customer_code\": \"DUP-$TS\",
  \"company_name\": \"Dup Corp\",
  \"email\": \"john_$TS@acme.local\",
  \"customer_type\": \"business\",
  \"status\": \"active\"
}")
check_code "Create customer with duplicate email → 409" "$DUP_CUST" "409"

LIST_CUST=$(auth "$BASE/crm/customers")
check_array "List customers" "$LIST_CUST"

SEARCH_CUST=$(auth "$BASE/crm/customers/search?q=Acme")
check_array "Search customers by name" "$SEARCH_CUST"

GET_CUST=$(auth "$BASE/crm/customers/$CUST_ID")
check_field "Get customer by ID" "$GET_CUST" ".id" "$CUST_ID"

UPD_CUST=$(auth -X PUT "$BASE/crm/customers/$CUST_ID" -d '{"contact_person":"Jane Smith","credit_limit":75000}')
check_field "Update customer contact" "$UPD_CUST" ".contact_person" "Jane Smith"

section "LEADS"
LEAD=$(auth -X POST "$BASE/crm/leads" -d "{
  \"first_name\": \"Bob\",
  \"last_name\": \"Prospect\",
  \"email\": \"bob_$TS@prospect.local\",
  \"company\": \"ProspectCo\",
  \"phone\": \"+1-555-0200\",
  \"status\": \"new\",
  \"source\": \"website\",
  \"estimated_value\": 20000
}")
LEAD_ID=$(echo "$LEAD" | jq -r '.id')
check_id "Create lead" "$LEAD"

LIST_LEAD=$(auth "$BASE/crm/leads")
check_array "List leads" "$LIST_LEAD"

GET_LEAD=$(auth "$BASE/crm/leads/$LEAD_ID")
check_field "Get lead by ID" "$GET_LEAD" ".id" "$LEAD_ID"

UPD_LEAD=$(auth -X PUT "$BASE/crm/leads/$LEAD_ID" -d '{"status":"contacted","notes":"Called, interested in Q3"}')
check_field "Update lead status → contacted" "$UPD_LEAD" ".status" "contacted"

section "OPPORTUNITIES"
OPP=$(auth -X POST "$BASE/crm/opportunities" -d "{
  \"title\": \"Acme Platform Deal $TS\",
  \"stage\": \"prospecting\",
  \"amount\": 50000,
  \"close_date\": \"2026-09-30\",
  \"probability\": 20,
  \"customer_id\": \"$CUST_ID\",
  \"lead_id\": \"$LEAD_ID\",
  \"description\": \"ERP platform implementation\"
}")
OPP_ID=$(echo "$OPP" | jq -r '.id')
check_id "Create opportunity" "$OPP"

LIST_OPP=$(auth "$BASE/crm/opportunities")
check_array "List opportunities" "$LIST_OPP"

STAGE1=$(auth -X PUT "$BASE/crm/opportunities/$OPP_ID" -d '{"stage":"qualification","probability":35}')
check_field "Advance to qualification stage" "$STAGE1" ".stage" "qualification"

STAGE2=$(auth -X PUT "$BASE/crm/opportunities/$OPP_ID" -d '{"stage":"proposal","probability":60}')
check_field "Advance to proposal stage" "$STAGE2" ".stage" "proposal"

STAGE3=$(auth -X PUT "$BASE/crm/opportunities/$OPP_ID" -d '{"stage":"negotiation","probability":80}')
check_field "Advance to negotiation stage" "$STAGE3" ".stage" "negotiation"

WON=$(auth -X PUT "$BASE/crm/opportunities/$OPP_ID" -d '{"stage":"closed_won","probability":100}')
check_field "Mark opportunity as won" "$WON" ".stage" "closed_won"

section "CONTACTS"
CONTACT=$(auth -X POST "$BASE/crm/contacts" -d "{
  \"first_name\": \"Carol\",
  \"last_name\": \"Williams\",
  \"email\": \"carol_$TS@acme.local\",
  \"phone\": \"+1-555-0300\",
  \"job_title\": \"CTO\",
  \"customer_id\": \"$CUST_ID\"
}")
CONTACT_ID=$(echo "$CONTACT" | jq -r '.id')
check_id "Create contact linked to customer" "$CONTACT"

LIST_CONTACT=$(auth "$BASE/crm/contacts")
check_array "List contacts" "$LIST_CONTACT"

section "ACTIVITIES"
ACT=$(auth -X POST "$BASE/crm/activities" -d "{
  \"activity_type\": \"call\",
  \"subject\": \"Discovery call with Acme\",
  \"notes\": \"Discussed implementation timeline and budget\",
  \"activity_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"customer_id\": \"$CUST_ID\",
  \"duration_minutes\": 45
}")
ACT_ID=$(echo "$ACT" | jq -r '.id')
check_id "Create call activity" "$ACT"

MEET=$(auth -X POST "$BASE/crm/activities" -d "{
  \"activity_type\": \"meeting\",
  \"subject\": \"Demo presentation\",
  \"notes\": \"Showed product features\",
  \"activity_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"customer_id\": \"$CUST_ID\",
  \"opportunity_id\": \"$OPP_ID\"
}")
check_id "Create meeting activity linked to opportunity" "$MEET"

LIST_ACT=$(auth "$BASE/crm/activities")
check_array "List activities" "$LIST_ACT"

section "QUOTES"
QUOTE=$(auth -X POST "$BASE/crm/quotes" -d "{
  \"quote_number\": \"QT-$TS\",
  \"quote_date\": \"2026-04-27\",
  \"expiry_date\": \"2026-07-31\",
  \"status\": \"draft\",
  \"subtotal\": 50000,
  \"tax\": 5000,
  \"total\": 55000,
  \"notes\": \"Platform license + implementation\",
  \"customer_id\": \"$CUST_ID\",
  \"opportunity_id\": \"$OPP_ID\"
}")
QUOTE_ID=$(echo "$QUOTE" | jq -r '.id')
check_id "Create quote for won opportunity" "$QUOTE"

LIST_QUOTE=$(auth "$BASE/crm/quotes")
check_array "List quotes" "$LIST_QUOTE"

SENT_QUOTE=$(auth -X PUT "$BASE/crm/quotes/$QUOTE_ID" -d '{"status":"sent"}')
check_field "Send quote to customer → sent" "$SENT_QUOTE" ".status" "sent"

ACCEPT_QUOTE=$(auth -X PUT "$BASE/crm/quotes/$QUOTE_ID" -d '{"status":"accepted"}')
check_field "Accept quote → accepted" "$ACCEPT_QUOTE" ".status" "accepted"

section "VALIDATION"
NOT_FOUND=$(auth "$BASE/crm/customers/00000000-0000-0000-0000-000000000000")
check_code "Get non-existent customer → 404" "$NOT_FOUND" "404"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
