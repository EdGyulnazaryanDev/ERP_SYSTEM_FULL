#!/bin/bash
BASE="http://localhost:3100/api"

TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

echo "Token: ${TOKEN:0:20}..."

declare -a CUSTOMERS=(
  '{"customer_code":"CUST-001","company_name":"Acme Corp","email":"contact@acme.com","phone":"+1-555-0101","address":"123 Main St, New York, NY","status":"active"}'
  '{"customer_code":"CUST-002","company_name":"TechVision Ltd","email":"info@techvision.com","phone":"+1-555-0102","address":"456 Tech Ave, San Francisco, CA","status":"active"}'
  '{"customer_code":"CUST-003","company_name":"Global Traders Inc","email":"sales@globaltraders.com","phone":"+1-555-0103","address":"789 Commerce Blvd, Chicago, IL","status":"active"}'
  '{"customer_code":"CUST-004","company_name":"Sunrise Manufacturing","email":"hello@sunrise-mfg.com","phone":"+1-555-0104","address":"321 Industrial Rd, Detroit, MI","status":"active"}'
  '{"customer_code":"CUST-005","company_name":"Blue Ocean Retail","email":"orders@blueocean.com","phone":"+1-555-0105","address":"654 Harbor Dr, Miami, FL","status":"active"}'
  '{"customer_code":"CUST-006","company_name":"Peak Solutions","email":"support@peaksolutions.com","phone":"+1-555-0106","address":"987 Summit Way, Denver, CO","status":"active"}'
  '{"customer_code":"CUST-007","company_name":"Nexus Dynamics","email":"contact@nexusdyn.com","phone":"+1-555-0107","address":"147 Innovation Pkwy, Austin, TX","status":"active"}'
  '{"customer_code":"CUST-008","company_name":"Horizon Logistics","email":"ops@horizonlogistics.com","phone":"+1-555-0108","address":"258 Freight Ln, Dallas, TX","status":"active"}'
  '{"customer_code":"CUST-009","company_name":"Sterling Finance","email":"info@sterlingfin.com","phone":"+1-555-0109","address":"369 Wall St, New York, NY","status":"active"}'
  '{"customer_code":"CUST-010","company_name":"Evergreen Services","email":"hello@evergreen.com","phone":"+1-555-0110","address":"741 Green Ave, Seattle, WA","status":"active"}'
)

for c in "${CUSTOMERS[@]}"; do
  RES=$(curl -s -X POST "$BASE/crm/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$c")
  NAME=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('company_name', d.get('message', str(d))))" 2>/dev/null)
  echo "  -> $NAME"
done

echo ""
echo "Verifying..."
curl -s "$BASE/crm/customers" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('data', d.get('items', []))
print(f'Total customers: {len(items)}')
for i in items:
    print(f'  - {i.get(\"company_name\",\"?\")} ({i.get(\"id\",\"?\")[:8]}...)')
"
