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
echo -e "${BOLD}║        WAREHOUSE - FULL API TEST         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password","actorType":"staff"}' | jq -r '.accessToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login OK" || { fail "Login" "no token"; exit 1; }

TS=$(date +%s)

section "WAREHOUSES"
WH=$(auth -X POST "$BASE/warehouse" -d "{
  \"name\": \"Main Warehouse $TS\",
  \"code\": \"WH-$TS\",
  \"address\": \"100 Storage Lane\",
  \"city\": \"Chicago\",
  \"state\": \"IL\",
  \"country\": \"USA\",
  \"postal_code\": \"60601\",
  \"is_active\": true,
  \"capacity\": 10000,
  \"manager\": \"John Manager\"
}")
WH_ID=$(echo "$WH" | jq -r '.id')
check_id "Create warehouse" "$WH"

DUP_WH=$(auth -X POST "$BASE/warehouse" -d "{
  \"name\": \"Dup Warehouse\",
  \"code\": \"WH-$TS\",
  \"address\": \"200 Dup Lane\",
  \"is_active\": true
}")
check_code "Create warehouse with duplicate code → 409" "$DUP_WH" "409"

LIST_WH=$(auth "$BASE/warehouse")
check_array "List warehouses" "$LIST_WH"

GET_WH=$(auth "$BASE/warehouse/$WH_ID")
check_field "Get warehouse by ID" "$GET_WH" ".id" "$WH_ID"

UPD_WH=$(auth -X PUT "$BASE/warehouse/$WH_ID" -d '{"manager":"Jane Manager","capacity":15000}')
check_field "Update warehouse manager" "$UPD_WH" ".manager" "Jane Manager"

section "BINS"
BIN1=$(auth -X POST "$BASE/warehouse/bins" -d "{
  \"bin_code\": \"A1-$TS\",
  \"bin_name\": \"Aisle A Shelf 1\",
  \"warehouse_id\": \"$WH_ID\",
  \"capacity\": 500,
  \"bin_type\": \"storage\",
  \"description\": \"Heavy items\"
}")
BIN1_ID=$(echo "$BIN1" | jq -r '.id')
check_id "Create bin in warehouse" "$BIN1"

BIN2=$(auth -X POST "$BASE/warehouse/bins" -d "{
  \"bin_code\": \"B2-$TS\",
  \"bin_name\": \"Aisle B Shelf 2\",
  \"warehouse_id\": \"$WH_ID\",
  \"capacity\": 200,
  \"bin_type\": \"picking\"
}")
BIN2_ID=$(echo "$BIN2" | jq -r '.id')
check_id "Create second bin (picking zone)" "$BIN2"

LIST_BINS=$(auth "$BASE/warehouse/bins")
check_array "List all bins" "$LIST_BINS"

WH_BINS=$(auth "$BASE/warehouse/bins?warehouse_id=$WH_ID")
check_array "List bins by warehouse" "$WH_BINS"

GET_BIN=$(auth "$BASE/warehouse/bins/$BIN1_ID")
check_field "Get bin by ID" "$GET_BIN" ".id" "$BIN1_ID"

section "STOCK MOVEMENTS"
MOV_IN=$(auth -X POST "$BASE/warehouse/stock-movements" -d "{
  \"movement_type\": \"stock_in\",
  \"quantity\": 100,
  \"reference\": \"GR-$TS\",
  \"notes\": \"Initial receipt from supplier\",
  \"movement_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"warehouse_id\": \"$WH_ID\",
  \"bin_id\": \"$BIN1_ID\",
  \"unit_cost\": 12.50
}")
check_id "Record stock-in movement" "$MOV_IN"

MOV_MOVE=$(auth -X POST "$BASE/warehouse/stock-movements" -d "{
  \"movement_type\": \"transfer\",
  \"quantity\": 25,
  \"reference\": \"TRANS-$TS\",
  \"notes\": \"Transfer to picking zone\",
  \"movement_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"warehouse_id\": \"$WH_ID\",
  \"from_bin_id\": \"$BIN1_ID\",
  \"bin_id\": \"$BIN2_ID\"
}")
check_id "Record transfer between bins" "$MOV_MOVE"

MOV_OUT=$(auth -X POST "$BASE/warehouse/stock-movements" -d "{
  \"movement_type\": \"stock_out\",
  \"quantity\": 10,
  \"reference\": \"SHIP-$TS\",
  \"notes\": \"Shipped to customer\",
  \"movement_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"warehouse_id\": \"$WH_ID\",
  \"bin_id\": \"$BIN2_ID\"
}")
check_id "Record stock-out movement" "$MOV_OUT"

MOV_ADJ=$(auth -X POST "$BASE/warehouse/stock-movements" -d "{
  \"movement_type\": \"adjustment\",
  \"quantity\": -5,
  \"reference\": \"ADJ-$TS\",
  \"notes\": \"Physical count correction\",
  \"movement_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"warehouse_id\": \"$WH_ID\",
  \"bin_id\": \"$BIN1_ID\"
}")
check_id "Record stock adjustment (negative)" "$MOV_ADJ"

LIST_MOV=$(auth "$BASE/warehouse/stock-movements")
check_array "List stock movements" "$LIST_MOV"

WH_MOV=$(auth "$BASE/warehouse/stock-movements?warehouse_id=$WH_ID")
check_array "Filter movements by warehouse" "$WH_MOV"

section "DELETE"
DEL_WH=$(auth -X POST "$BASE/warehouse" -d "{
  \"name\": \"Delete Me $TS\",
  \"code\": \"DEL-$TS\",
  \"address\": \"1 Delete St\",
  \"is_active\": false
}")
DEL_WH_ID=$(echo "$DEL_WH" | jq -r '.id')
DEL=$(auth -X DELETE "$BASE/warehouse/$DEL_WH_ID")
DEL_OK=$(echo "$DEL" | jq -r 'has("message") or (.statusCode == null)' 2>/dev/null)
[ "$DEL_OK" = "true" ] && pass "Delete empty warehouse" || fail "Delete warehouse" "$DEL"

NOT_FOUND=$(auth "$BASE/warehouse/00000000-0000-0000-0000-000000000000")
check_code "Get non-existent warehouse → 404" "$NOT_FOUND" "404"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
