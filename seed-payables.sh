#!/bin/bash
BASE="http://localhost:3100/api"

TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

echo "=== Checking existing suppliers ==="
SUPPLIERS=$(curl -s "$BASE/suppliers?pageSize=100" -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$SUPPLIERS" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('data',[]); print(len(items))")
echo "Existing suppliers: $COUNT"

if [ "$COUNT" -eq "0" ]; then
  echo "=== Seeding suppliers ==="
  declare -a SUPPLIERS_DATA=(
    '{"name":"Office Depot","email":"billing@officedepot.com","phone":"+1-555-1001","address":"100 Supply Rd, Atlanta, GA"}'
    '{"name":"AWS Cloud Services","email":"invoices@aws.com","phone":"+1-555-1002","address":"410 Terry Ave N, Seattle, WA"}'
    '{"name":"FedEx Shipping","email":"accounts@fedex.com","phone":"+1-555-1003","address":"942 S Shady Grove Rd, Memphis, TN"}'
    '{"name":"Dell Technologies","email":"ar@dell.com","phone":"+1-555-1004","address":"1 Dell Way, Round Rock, TX"}'
    '{"name":"Staples Inc","email":"billing@staples.com","phone":"+1-555-1005","address":"500 Staples Dr, Framingham, MA"}'
  )
  for s in "${SUPPLIERS_DATA[@]}"; do
    RES=$(curl -s -X POST "$BASE/suppliers" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$s")
    NAME=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name', d.get('message', str(d)[:80])))" 2>/dev/null)
    echo "  Supplier: $NAME"
  done
fi

echo ""
echo "=== Getting supplier IDs ==="
SUPPLIERS_JSON=$(curl -s "$BASE/suppliers?pageSize=100" -H "Authorization: Bearer $TOKEN")
SUPPLIER_IDS=$(echo "$SUPPLIERS_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('data', [])
for i in items[:5]:
    print(i['id'] + '|' + i['name'])
")
echo "$SUPPLIER_IDS"

echo ""
echo "=== Creating Accounts Payable ==="
declare -a BILLS=(
  "BILL-2026-001|Office supplies Q1|2026-01-15|2026-02-14|1250.00"
  "BILL-2026-002|Cloud hosting Jan|2026-01-01|2026-01-31|3800.00"
  "BILL-2026-003|Shipping services|2026-01-20|2026-02-04|620.50"
  "BILL-2026-004|Laptop equipment|2026-02-01|2026-03-17|8500.00"
  "BILL-2026-005|Office supplies Q2|2026-02-10|2026-03-11|980.00"
  "BILL-2026-006|Cloud hosting Feb|2026-02-01|2026-03-03|3800.00"
  "BILL-2026-007|Freight charges|2026-02-15|2026-03-02|445.75"
  "BILL-2026-008|Server hardware|2026-03-01|2026-04-15|12000.00"
  "BILL-2026-009|Printer supplies|2026-03-05|2026-04-04|320.00"
  "BILL-2026-010|Cloud hosting Mar|2026-03-01|2026-03-31|3800.00"
)

# Get first 5 supplier IDs into array
mapfile -t SID_ARRAY < <(echo "$SUPPLIER_IDS" | cut -d'|' -f1)

i=0
for bill in "${BILLS[@]}"; do
  IFS='|' read -r bill_num desc bill_date due_date amount <<< "$bill"
  sid="${SID_ARRAY[$((i % ${#SID_ARRAY[@]}))]}"
  
  PAYLOAD=$(python3 -c "import json; print(json.dumps({
    'supplier_id': '$sid',
    'bill_number': '$bill_num',
    'bill_date': '$bill_date',
    'due_date': '$due_date',
    'amount': $amount,
    'description': '$desc'
  }))")

  RES=$(curl -s -X POST "$BASE/accounting/accounts-payable" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$PAYLOAD")
  
  STATUS=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bill_number', d.get('message', str(d)[:80])))" 2>/dev/null)
  echo "  $bill_num -> $STATUS"
  i=$((i+1))
done

echo ""
echo "=== Verifying ==="
curl -s "$BASE/accounting/accounts-payable" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('data', [])
print(f'Total AP records: {len(items)}')
for r in items:
    print(f'  {r.get(\"bill_number\",\"?\")} | \${r.get(\"total_amount\",0)} | {r.get(\"status\",\"?\")}')
"
