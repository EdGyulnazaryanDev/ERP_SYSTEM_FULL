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
echo -e "${BOLD}║      MANUFACTURING - FULL API TEST       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password","actorType":"staff"}' | jq -r '.accessToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login OK" || { fail "Login" "no token"; exit 1; }

TS=$(date +%s)

section "BILLS OF MATERIALS"
BOM=$(auth -X POST "$BASE/manufacturing/boms" -d "{
  \"bom_number\": \"BOM-$TS\",
  \"product_name\": \"Assembly Unit $TS\",
  \"product_code\": \"AU-$TS\",
  \"quantity\": 1,
  \"unit\": \"pcs\",
  \"status\": \"draft\",
  \"version\": \"1.0\",
  \"notes\": \"Standard production BOM\",
  \"lines\": [
    {\"component_name\": \"Steel Frame\",  \"component_code\": \"SF-001\", \"quantity\": 2, \"unit\": \"pcs\", \"unit_cost\": 15.00},
    {\"component_name\": \"Bolts M8\",     \"component_code\": \"BM8\",    \"quantity\": 8, \"unit\": \"pcs\", \"unit_cost\": 0.50},
    {\"component_name\": \"Rubber Gasket\",\"component_code\": \"RG-001\",  \"quantity\": 1, \"unit\": \"pcs\", \"unit_cost\": 3.00}
  ]
}")
BOM_ID=$(echo "$BOM" | jq -r '.id')
check_id "Create BOM with 3 components" "$BOM"

LINES=$(echo "$BOM" | jq '.lines | length')
[ "$LINES" -eq 3 ] && pass "BOM has 3 component lines" || fail "BOM lines count (expected 3, got $LINES)" "$BOM"

LIST_BOM=$(auth "$BASE/manufacturing/boms")
check_array "List BOMs" "$LIST_BOM"

GET_BOM=$(auth "$BASE/manufacturing/boms/$BOM_ID")
check_field "Get BOM by ID" "$GET_BOM" ".id" "$BOM_ID"

UPD_BOM=$(auth -X PUT "$BASE/manufacturing/boms/$BOM_ID" -d '{"notes":"Updated BOM notes","version":"1.1"}')
check_field "Update BOM version" "$UPD_BOM" ".version" "1.1"

APPROVE_BOM=$(auth -X POST "$BASE/manufacturing/boms/$BOM_ID/approve" -d "{
  \"approved_by\": \"Production Manager\",
  \"notes\": \"Approved for production run\"
}")
check_field "Approve BOM → approved" "$APPROVE_BOM" ".status" "approved"

APPROVE_AGAIN=$(auth -X POST "$BASE/manufacturing/boms/$BOM_ID/approve" -d '{"approved_by":"Same Manager"}')
check_code "Re-approve already approved BOM → 400" "$APPROVE_AGAIN" "400"

NOT_FOUND_BOM=$(auth "$BASE/manufacturing/boms/00000000-0000-0000-0000-000000000000")
check_code "Get non-existent BOM → 404" "$NOT_FOUND_BOM" "404"

section "WORK ORDERS"
WO=$(auth -X POST "$BASE/manufacturing/work-orders" -d "{
  \"work_order_number\": \"WO-$TS\",
  \"bom_id\": \"$BOM_ID\",
  \"planned_start_date\": \"2026-05-01\",
  \"planned_end_date\": \"2026-05-10\",
  \"quantity\": 50,
  \"status\": \"draft\",
  \"priority\": \"high\",
  \"notes\": \"May production run\"
}")
WO_ID=$(echo "$WO" | jq -r '.id')
check_id "Create work order from approved BOM" "$WO"

LIST_WO=$(auth "$BASE/manufacturing/work-orders")
check_array "List work orders" "$LIST_WO"

GET_WO=$(auth "$BASE/manufacturing/work-orders/$WO_ID")
check_field "Get work order by ID" "$GET_WO" ".id" "$WO_ID"

RELEASE=$(auth -X PUT "$BASE/manufacturing/work-orders/$WO_ID/release" -d '{}')
check_field "Release work order → released" "$RELEASE" ".status" "released"

START_WO=$(auth -X PUT "$BASE/manufacturing/work-orders/$WO_ID" -d '{"status":"in_progress","actual_start_date":"2026-05-01"}')
check_field "Start work order → in_progress" "$START_WO" ".status" "in_progress"

COMPLETE=$(auth -X PUT "$BASE/manufacturing/work-orders/$WO_ID/complete" -d "{
  \"actual_quantity\": 48,
  \"actual_end_date\": \"2026-05-09\",
  \"notes\": \"2 units failed QC\"
}")
check_field "Complete work order → completed" "$COMPLETE" ".status" "completed"

ACTUAL_QTY=$(echo "$COMPLETE" | jq -r '.actual_quantity')
[ "$ACTUAL_QTY" = "48" ] && pass "Work order actual_quantity saved (48)" || fail "actual_quantity" "$COMPLETE"

section "PRODUCTION PLANS"
PLAN=$(auth -X POST "$BASE/manufacturing/production-plans" -d "{
  \"plan_name\": \"May 2026 Production\",
  \"plan_period_start\": \"2026-05-01\",
  \"plan_period_end\": \"2026-05-31\",
  \"status\": \"draft\",
  \"notes\": \"Monthly plan\",
  \"lines\": [
    {\"bom_id\": \"$BOM_ID\", \"planned_quantity\": 200, \"unit\": \"pcs\", \"priority\": \"high\"}
  ]
}")
PLAN_ID=$(echo "$PLAN" | jq -r '.id')
check_id "Create production plan" "$PLAN"

LIST_PLAN=$(auth "$BASE/manufacturing/production-plans")
check_array "List production plans" "$LIST_PLAN"

GET_PLAN=$(auth "$BASE/manufacturing/production-plans/$PLAN_ID")
check_field "Get plan by ID" "$GET_PLAN" ".id" "$PLAN_ID"

APPROVE_PLAN=$(auth -X POST "$BASE/manufacturing/production-plans/$PLAN_ID/approve" -d '{"approved_by":"Plant Manager"}')
check_field "Approve production plan → approved" "$APPROVE_PLAN" ".status" "approved"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
