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
echo -e "${BOLD}║       PROCUREMENT - FULL API TEST        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password","actorType":"staff"}')
TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
USER_ID=$(echo "$LOGIN" | jq -r '.user.id')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login OK" || { fail "Login" "no token"; exit 1; }

TS=$(date +%s)

section "PURCHASE REQUISITIONS"
REQ=$(auth -X POST "$BASE/procurement/requisitions" -d "{
  \"requisition_number\": \"REQ-$TS\",
  \"requisition_date\": \"2026-04-27\",
  \"requested_by\": \"$USER_ID\",
  \"department\": \"Engineering\",
  \"status\": \"pending\",
  \"priority\": \"medium\",
  \"required_by_date\": \"2026-06-01\",
  \"purpose\": \"Office supplies\",
  \"items\": [
    {\"product_name\": \"Laptop Stand\", \"quantity\": 5, \"unit\": \"pcs\", \"estimated_price\": 45, \"total_estimated\": 225},
    {\"product_name\": \"USB Hub\",      \"quantity\": 3, \"unit\": \"pcs\", \"estimated_price\": 25, \"total_estimated\": 75}
  ]
}")
REQ_ID=$(echo "$REQ" | jq -r '.id')
check_id "Create purchase requisition" "$REQ"

LIST_REQ=$(auth "$BASE/procurement/requisitions")
check_array "List requisitions" "$LIST_REQ"

GET_REQ=$(auth "$BASE/procurement/requisitions/$REQ_ID")
check_field "Get requisition by ID" "$GET_REQ" ".id" "$REQ_ID"

PENDING=$(auth "$BASE/procurement/pending-approvals")
check_array "List pending approvals" "$PENDING"

APPROVE=$(auth -X POST "$BASE/procurement/requisitions/$REQ_ID/approve" -d "{
  \"approved_by\": \"$USER_ID\",
  \"notes\": \"Approved for Q2\"
}")
check_field "Approve requisition → approved" "$APPROVE" ".status" "approved"

REQ2=$(auth -X POST "$BASE/procurement/requisitions" -d "{
  \"requisition_number\": \"REQ2-$TS\",
  \"requisition_date\": \"2026-04-27\",
  \"requested_by\": \"$USER_ID\",
  \"department\": \"HR\",
  \"status\": \"pending\",
  \"items\": [{\"product_name\": \"Office Chair\", \"quantity\": 2, \"unit\": \"pcs\", \"estimated_price\": 200, \"total_estimated\": 400}]
}")
REQ2_ID=$(echo "$REQ2" | jq -r '.id')
REJECT=$(auth -X POST "$BASE/procurement/requisitions/$REQ2_ID/reject" -d "{
  \"rejection_reason\": \"Over budget for current quarter\"
}")
check_field "Reject requisition → rejected" "$REJECT" ".status" "rejected"

section "RFQs"
RFQ=$(auth -X POST "$BASE/procurement/rfqs" -d "{
  \"rfq_number\": \"RFQ-$TS\",
  \"rfq_date\": \"2026-04-27\",
  \"deadline\": \"2026-05-15\",
  \"requisition_id\": \"$REQ_ID\",
  \"notes\": \"Please provide best price and delivery time\"
}")
RFQ_ID=$(echo "$RFQ" | jq -r '.id')
check_id "Create RFQ from requisition" "$RFQ"

LIST_RFQ=$(auth "$BASE/procurement/rfqs")
check_array "List RFQs" "$LIST_RFQ"

GET_RFQ=$(auth "$BASE/procurement/rfqs/$RFQ_ID")
check_field "Get RFQ by ID" "$GET_RFQ" ".id" "$RFQ_ID"

section "VENDOR QUOTES"
VQ=$(auth -X POST "$BASE/procurement/vendor-quotes" -d "{
  \"rfq_id\": \"$RFQ_ID\",
  \"quote_number\": \"VQ-$TS\",
  \"quote_date\": \"2026-05-01\",
  \"valid_until\": \"2026-05-31\",
  \"subtotal\": 280,
  \"tax\": 28,
  \"total\": 308,
  \"delivery_days\": 7,
  \"notes\": \"Best price guaranteed\",
  \"items\": [
    {\"product_name\": \"Laptop Stand\", \"quantity\": 5, \"unit_price\": 40, \"total\": 200},
    {\"product_name\": \"USB Hub\",      \"quantity\": 3, \"unit_price\": 22, \"total\": 66}
  ]
}")
VQ_ID=$(echo "$VQ" | jq -r '.id')
check_id "Create vendor quote" "$VQ"

LIST_VQ=$(auth "$BASE/procurement/vendor-quotes")
check_array "List vendor quotes" "$LIST_VQ"

section "PURCHASE ORDERS"
PO=$(auth -X POST "$BASE/procurement/purchase-orders" -d "{
  \"po_number\": \"PO-$TS\",
  \"order_date\": \"2026-04-27\",
  \"expected_delivery\": \"2026-05-20\",
  \"status\": \"draft\",
  \"subtotal\": 280,
  \"tax\": 28,
  \"total\": 308,
  \"requisition_id\": \"$REQ_ID\",
  \"items\": [
    {\"product_name\": \"Laptop Stand\", \"quantity\": 5, \"unit\": \"pcs\", \"unit_price\": 40, \"total\": 200},
    {\"product_name\": \"USB Hub\",      \"quantity\": 3, \"unit\": \"pcs\", \"unit_price\": 22, \"total\": 66}
  ]
}")
PO_ID=$(echo "$PO" | jq -r '.id')
check_id "Create purchase order" "$PO"

LIST_PO=$(auth "$BASE/procurement/purchase-orders")
check_array "List purchase orders" "$LIST_PO"

GET_PO=$(auth "$BASE/procurement/purchase-orders/$PO_ID")
check_field "Get PO by ID" "$GET_PO" ".id" "$PO_ID"

SEND_PO=$(auth -X PUT "$BASE/procurement/purchase-orders/$PO_ID" -d '{"status":"sent"}')
check_field "Send PO to supplier → sent" "$SEND_PO" ".status" "sent"

section "GOODS RECEIPTS"
GR=$(auth -X POST "$BASE/procurement/goods-receipts" -d "{
  \"receipt_number\": \"GR-$TS\",
  \"receipt_date\": \"2026-05-10\",
  \"purchase_order_id\": \"$PO_ID\",
  \"status\": \"pending\",
  \"notes\": \"All items received in good condition\",
  \"items\": [
    {\"product_name\": \"Laptop Stand\", \"quantity_received\": 5, \"unit\": \"pcs\"},
    {\"product_name\": \"USB Hub\",      \"quantity_received\": 3, \"unit\": \"pcs\"}
  ]
}")
GR_ID=$(echo "$GR" | jq -r '.id')
check_id "Create goods receipt" "$GR"

LIST_GR=$(auth "$BASE/procurement/goods-receipts")
check_array "List goods receipts" "$LIST_GR"

GET_GR=$(auth "$BASE/procurement/goods-receipts/$GR_ID")
check_field "Get goods receipt by ID" "$GET_GR" ".id" "$GR_ID"

APPROVE_GR=$(auth -X POST "$BASE/procurement/goods-receipts/$GR_ID/approve" -d "{
  \"approved_by\": \"$USER_ID\",
  \"notes\": \"All items verified and stored\"
}")
check_field "Approve goods receipt → approved" "$APPROVE_GR" ".status" "approved"

section "VALIDATION"
NO_ITEMS=$(auth -X POST "$BASE/procurement/requisitions" -d "{
  \"requisition_number\": \"NO-ITEMS-$TS\",
  \"requisition_date\": \"2026-04-27\",
  \"requested_by\": \"$USER_ID\",
  \"department\": \"IT\",
  \"items\": []
}")
check_code "Create requisition with empty items → 400" "$NO_ITEMS" "400"

NOT_FOUND=$(auth "$BASE/procurement/requisitions/00000000-0000-0000-0000-000000000000")
check_code "Get non-existent requisition → 404" "$NOT_FOUND" "404"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
