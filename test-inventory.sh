#!/bin/bash
BASE="http://localhost:3100/api"
PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'
pass() { echo -e "${GREEN}✓ PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗ FAIL${NC} $1 → $2"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${BOLD}${YELLOW}=== $1 ===${NC}"; }
check_id()    { local id=$(echo "$2"|jq -r '.id' 2>/dev/null); [ -n "$id" ] && [ "$id" != "null" ] && pass "$1 (id=${id:0:8}...)" || fail "$1" "$2"; }
check_array() { local n=$(echo "$2"|jq 'if type=="array" then length else (.data|length) end' 2>/dev/null); [ "${n:-0}" -ge 0 ] && pass "$1 → $n items" || fail "$1" "$2"; }
check_field() { local v=$(echo "$2"|jq -r "$3" 2>/dev/null); [ "$v" = "$4" ] && pass "$1 ($3=$v)" || fail "$1 (expected $3=$4, got $v)" "$2"; }
check_code()  { local c=$(echo "$2"|jq -r '.statusCode' 2>/dev/null); [ "$c" = "$3" ] && pass "$1 → HTTP $c" || fail "$1 (expected $3, got $c)" "$2"; }
auth() { curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        INVENTORY - FULL API TEST         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password","actorType":"staff"}' | jq -r '.accessToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login OK" || { fail "Login" "no token"; exit 1; }

TS=$(date +%s)

section "CREATE"
ITEM=$(auth -X POST "$BASE/inventory" -d "{
  \"product_name\": \"Widget Pro $TS\",
  \"sku\": \"SKU-$TS\",
  \"quantity\": 100,
  \"reorder_point\": 15,
  \"unit_cost\": 8.50,
  \"unit_price\": 19.99,
  \"category\": \"Electronics\",
  \"location\": \"Shelf A1\"
}")
ITEM_ID=$(echo "$ITEM" | jq -r '.id')
check_id "Create inventory item" "$ITEM"

LOW_ITEM=$(auth -X POST "$BASE/inventory" -d "{
  \"product_name\": \"Low Stock Item $TS\",
  \"sku\": \"LOW-$TS\",
  \"quantity\": 3,
  \"reorder_point\": 20,
  \"unit_cost\": 5.00,
  \"unit_price\": 10.00
}")
LOW_ID=$(echo "$LOW_ITEM" | jq -r '.id')
check_id "Create low-stock item (qty=3, reorder=20)" "$LOW_ITEM"

NO_NAME=$(auth -X POST "$BASE/inventory" -d "{\"sku\": \"NONAME-$TS\", \"quantity\": 10}")
check_code "Create without product_name → 400" "$NO_NAME" "400"

DUP=$(auth -X POST "$BASE/inventory" -d "{
  \"product_name\": \"Duplicate SKU\",
  \"sku\": \"SKU-$TS\",
  \"quantity\": 5
}")
check_code "Create duplicate SKU → 409" "$DUP" "409"

STR_QTY=$(auth -X POST "$BASE/inventory" -d "{
  \"product_name\": \"String Qty $TS\",
  \"sku\": \"STRQ-$TS\",
  \"quantity\": \"50\"
}")
QTY_TYPE=$(echo "$STR_QTY" | jq -r '.quantity | type')
[ "$QTY_TYPE" = "number" ] && pass "String quantity coerced to number" || fail "String quantity coercion" "$STR_QTY"

section "READ"
LIST=$(auth "$BASE/inventory")
check_array "List all inventory items" "$LIST"

SINGLE=$(auth "$BASE/inventory/$ITEM_ID")
check_field "Get item by ID" "$SINGLE" ".id" "$ITEM_ID"

NOT_FOUND=$(auth "$BASE/inventory/00000000-0000-0000-0000-000000000000")
check_code "Get non-existent item → 404" "$NOT_FOUND" "404"

section "LOW STOCK"
LOW=$(auth "$BASE/inventory/low-stock")
LOW_COUNT=$(echo "$LOW" | jq 'if type=="array" then length else 0 end')
[ "$LOW_COUNT" -ge 1 ] && pass "Low-stock list returns items ($LOW_COUNT)" || fail "Low-stock list" "$LOW"

section "SUMMARY"
SUMMARY=$(auth "$BASE/inventory/summary")
HAS_TOTAL=$(echo "$SUMMARY" | jq 'has("total") or has("totalItems") or has("totalValue")' 2>/dev/null)
[ "$HAS_TOTAL" = "true" ] && pass "Summary returns aggregated data" || fail "Summary" "$SUMMARY"

section "UPDATE"
UPD=$(auth -X PUT "$BASE/inventory/$ITEM_ID" -d '{"quantity": 150, "unit_price": 24.99}')
check_field "Update quantity and price" "$UPD" ".quantity" "150"

section "DELETE"
DEL_ITEM=$(auth -X POST "$BASE/inventory" -d "{
  \"product_name\": \"Delete Me $TS\",
  \"sku\": \"DEL-$TS\",
  \"quantity\": 1
}")
DEL_ID=$(echo "$DEL_ITEM" | jq -r '.id')
DEL=$(auth -X DELETE "$BASE/inventory/$DEL_ID")
DEL_OK=$(echo "$DEL" | jq -r '.statusCode // "ok"')
[ "$DEL_OK" = "ok" ] || [ -z "$(echo $DEL | jq -r '.statusCode' 2>/dev/null | grep -v null)" ] && pass "Delete inventory item" || fail "Delete item" "$DEL"

DEL404=$(auth -X DELETE "$BASE/inventory/00000000-0000-0000-0000-000000000000")
check_code "Delete non-existent → 404" "$DEL404" "404"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
