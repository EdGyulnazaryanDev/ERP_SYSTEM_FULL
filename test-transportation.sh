#!/bin/bash

BASE="http://localhost:3100/api"
TR="$BASE/transportation"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           TRANSPORTATION - FULL API TEST             ║"
echo "║        Overview · Shipments · Couriers               ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── Auth ──────────────────────────────────────────────────────────────────────
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ LOGIN FAILED"; exit 1
fi
echo "✅ LOGIN OK"
H="Authorization: Bearer $TOKEN"
UNIQUE="$(date +%s)"

pass() { echo "  ✅ PASS: $1"; }
fail() { echo "  ❌ FAIL: $1"; echo "     → $2"; }

check_id() {
  local label="$1" resp="$2"
  local id=$(echo "$resp" | jq -r '.id' 2>/dev/null)
  if [ -n "$id" ] && [ "$id" != "null" ]; then pass "$label → id=$id"
  else fail "$label" "$resp"; fi
}

check_array() {
  local label="$1" resp="$2"
  local n=$(echo "$resp" | jq 'if type=="array" then length else -1 end' 2>/dev/null)
  if [ "$n" -ge 0 ]; then pass "$label → $n items"
  else fail "$label" "$resp"; fi
}

check_field() {
  local label="$1" resp="$2" field="$3" expected="$4"
  local val=$(echo "$resp" | jq -r "$field" 2>/dev/null)
  if [ "$val" = "$expected" ]; then pass "$label → $field=$val"
  else fail "$label (expected $field=$expected, got $val)" "$resp"; fi
}

check_code() {
  local label="$1" resp="$2" expected="$3"
  local code=$(echo "$resp" | jq -r '.statusCode' 2>/dev/null)
  if [ "$code" = "$expected" ]; then pass "$label → HTTP $code"
  else fail "$label (expected $expected, got $code)" "$resp"; fi
}

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TAB: COURIERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. GET all couriers
R=$(curl -s "$TR/couriers" -H "$H")
check_array "GET /couriers" "$R"

# 2. CREATE courier (internal driver)
R=$(curl -s -X POST "$TR/couriers" -H "$H" -H "Content-Type: application/json" -d '{
  "name": "John Driver",
  "type": "internal",
  "status": "active",
  "phone": "+1-555-0101",
  "email": "john.driver@test.com",
  "vehicle_number": "TRK-'$UNIQUE'",
  "vehicle_type": "van",
  "license_number": "LIC-'$UNIQUE'",
  "base_rate": 25.00,
  "per_km_rate": 1.50,
  "notes": "Test courier"
}')
COURIER_ID=$(echo "$R" | jq -r '.id')
COURIER_CODE=$(echo "$R" | jq -r '.code')
check_id "POST /couriers (internal)" "$R"
echo "  ℹ  courier code auto-generated: $COURIER_CODE"

# 3. CREATE second courier (external company)
R=$(curl -s -X POST "$TR/couriers" -H "$H" -H "Content-Type: application/json" -d '{
  "name": "FastEx Logistics",
  "type": "external",
  "status": "active",
  "company_name": "FastEx Ltd",
  "phone": "+1-555-0202",
  "email": "ops@fastex.test",
  "base_rate": 15.00,
  "per_km_rate": 0.80
}')
COURIER2_ID=$(echo "$R" | jq -r '.id')
check_id "POST /couriers (external company)" "$R"

# 4. GET courier by ID
R=$(curl -s "$TR/couriers/$COURIER_ID" -H "$H")
check_field "GET /couriers/:id" "$R" ".name" "John Driver"

# 5. UPDATE courier
R=$(curl -s -X PUT "$TR/couriers/$COURIER_ID" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "active",
  "base_rate": 30.00,
  "rating": 4.8
}')
check_field "PUT /couriers/:id (update rate+rating)" "$R" ".status" "active"

# 6. GET courier not found
R=$(curl -s "$TR/couriers/00000000-0000-0000-0000-000000000000" -H "$H")
check_code "GET /couriers/:id not found" "$R" "404"

# 7. No token → 401
R=$(curl -s "$TR/couriers")
check_code "GET /couriers without token" "$R" "401"

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TAB: SHIPMENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 8. GET all shipments
R=$(curl -s "$TR/shipments" -H "$H")
check_array "GET /shipments" "$R"

# 9. CREATE shipment (full payload)
R=$(curl -s -X POST "$TR/shipments" -H "$H" -H "Content-Type: application/json" -d '{
  "courier_id": "'"$COURIER_ID"'",
  "priority": "high",
  "origin_name": "Warehouse A",
  "origin_address": "123 Industrial Blvd",
  "origin_city": "New York",
  "origin_postal_code": "10001",
  "origin_phone": "+1-555-1000",
  "destination_name": "Customer Corp",
  "destination_address": "456 Business Ave",
  "destination_city": "Los Angeles",
  "destination_postal_code": "90001",
  "destination_phone": "+1-555-2000",
  "destination_latitude": 34.0522,
  "destination_longitude": -118.2437,
  "weight": 12.5,
  "weight_unit": "kg",
  "volume": 0.08,
  "package_count": 2,
  "package_type": "box",
  "pickup_date": "2026-03-20T09:00:00Z",
  "estimated_delivery_date": "2026-03-22T17:00:00Z",
  "shipping_cost": 45.00,
  "insurance_cost": 5.00,
  "notes": "Handle with care",
  "special_instructions": "Leave at reception",
  "requires_signature": true,
  "is_fragile": true,
  "is_insured": true,
  "items": [
    {
      "product_name": "Laptop Computer",
      "sku": "LAP-001",
      "quantity": 1,
      "weight": 2.5,
      "description": "15-inch laptop"
    },
    {
      "product_name": "Laptop Bag",
      "sku": "BAG-001",
      "quantity": 1,
      "weight": 0.5,
      "description": "Protective bag"
    }
  ]
}')
SHIPMENT_ID=$(echo "$R" | jq -r '.id')
TRACKING_NUM=$(echo "$R" | jq -r '.tracking_number')
check_id "POST /shipments (full payload)" "$R"
echo "  ℹ  tracking number auto-generated: $TRACKING_NUM"

# Verify total_cost = shipping_cost + insurance_cost
TOTAL=$(echo "$R" | jq -r '.total_cost')
echo "  ℹ  total_cost=$TOTAL (expected 50.00)"

# Verify tracking_history initialized
HIST_LEN=$(echo "$R" | jq '.tracking_history | length')
if [ "$HIST_LEN" -ge 1 ]; then pass "POST /shipments → tracking_history initialized ($HIST_LEN entry)"
else fail "POST /shipments tracking_history empty" "$R"; fi

# Verify items created
ITEMS_LEN=$(echo "$R" | jq '.items | length')
if [ "$ITEMS_LEN" -eq 2 ]; then pass "POST /shipments → 2 items created"
else fail "POST /shipments items count (expected 2, got $ITEMS_LEN)" "$R"; fi

# 10. CREATE minimal shipment (no courier, no optional fields)
R=$(curl -s -X POST "$TR/shipments" -H "$H" -H "Content-Type: application/json" -d '{
  "origin_name": "Store B",
  "origin_address": "789 Main St",
  "destination_name": "Home Delivery",
  "destination_address": "321 Oak Lane",
  "items": [{"product_name": "Book", "quantity": 3}]
}')
SHIPMENT2_ID=$(echo "$R" | jq -r '.id')
TRACKING2=$(echo "$R" | jq -r '.tracking_number')
check_id "POST /shipments (minimal, no courier)" "$R"

# 11. GET shipment by ID
R=$(curl -s "$TR/shipments/$SHIPMENT_ID" -H "$H")
check_field "GET /shipments/:id" "$R" ".priority" "high"

# 12. GET shipments filtered by status
R=$(curl -s "$TR/shipments?status=pending" -H "$H")
check_array "GET /shipments?status=pending" "$R"

# 13. GET shipments filtered by courier
R=$(curl -s "$TR/shipments?courier_id=$COURIER_ID" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 1 ]; then pass "GET /shipments?courier_id → $COUNT shipments"
else fail "GET /shipments?courier_id" "$R"; fi

# 14. GET shipments filtered by date range
R=$(curl -s "$TR/shipments?startDate=2026-01-01&endDate=2026-12-31" -H "$H")
check_array "GET /shipments?startDate&endDate" "$R"

# 15. TRACK shipment by tracking number (requires auth - guard is class-level)
R=$(curl -s "$TR/shipments/track/$TRACKING_NUM" -H "$H")
check_field "GET /shipments/track/:trackingNumber" "$R" ".tracking_number" "$TRACKING_NUM"

# 16. TRACK non-existent tracking number
R=$(curl -s "$TR/shipments/track/TRK-INVALID-999999" -H "$H")
check_code "GET /shipments/track/:trackingNumber not found" "$R" "404"

# 17. UPDATE shipment status → picked_up
R=$(curl -s -X PUT "$TR/shipments/$SHIPMENT_ID/status" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "picked_up",
  "notes": "Package collected from warehouse",
  "location": "123 Industrial Blvd, New York"
}')
check_field "PUT /shipments/:id/status → picked_up" "$R" ".status" "picked_up"

# 18. UPDATE shipment status → in_transit
R=$(curl -s -X PUT "$TR/shipments/$SHIPMENT_ID/status" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "in_transit",
  "notes": "On the road",
  "location": "Highway I-10, Arizona"
}')
check_field "PUT /shipments/:id/status → in_transit" "$R" ".status" "in_transit"

# Verify tracking history is growing
HIST_LEN=$(echo "$R" | jq '.tracking_history | length')
if [ "$HIST_LEN" -ge 3 ]; then pass "tracking_history growing → $HIST_LEN entries"
else fail "tracking_history should have ≥3 entries, got $HIST_LEN" "$R"; fi

# 19. UPDATE shipment status → out_for_delivery
R=$(curl -s -X PUT "$TR/shipments/$SHIPMENT_ID/status" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "out_for_delivery",
  "location": "Los Angeles Distribution Center"
}')
check_field "PUT /shipments/:id/status → out_for_delivery" "$R" ".status" "out_for_delivery"

# 20. PROOF OF DELIVERY
R=$(curl -s -X POST "$TR/shipments/$SHIPMENT_ID/proof-of-delivery" -H "$H" -H "Content-Type: application/json" -d '{
  "delivered_to": "Jane Smith (Receptionist)",
  "signature": "data:image/png;base64,iVBORw0KGgo=",
  "photos": ["photo1.jpg", "photo2.jpg"],
  "notes": "Delivered to reception desk"
}')
check_field "POST /shipments/:id/proof-of-delivery" "$R" ".status" "delivered"
DELIVERED_TO=$(echo "$R" | jq -r '.delivered_to')
if [ "$DELIVERED_TO" = "Jane Smith (Receptionist)" ]; then pass "proof-of-delivery → delivered_to saved"
else fail "proof-of-delivery delivered_to" "$R"; fi
ACTUAL_DATE=$(echo "$R" | jq -r '.actual_delivery_date')
if [ -n "$ACTUAL_DATE" ] && [ "$ACTUAL_DATE" != "null" ]; then pass "proof-of-delivery → actual_delivery_date set"
else fail "proof-of-delivery actual_delivery_date not set" "$R"; fi

# 21. UPDATE second shipment → cancelled
R=$(curl -s -X PUT "$TR/shipments/$SHIPMENT2_ID/status" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "cancelled",
  "notes": "Customer cancelled order"
}')
check_field "PUT /shipments/:id/status → cancelled" "$R" ".status" "cancelled"

# 22. CREATE shipment - validation error (missing required fields)
R=$(curl -s -X POST "$TR/shipments" -H "$H" -H "Content-Type: application/json" -d '{
  "origin_name": "Only origin, missing destination and items"
}')
check_code "POST /shipments validation error (missing required)" "$R" "400"

# 23. GET shipment not found
R=$(curl -s "$TR/shipments/00000000-0000-0000-0000-000000000000" -H "$H")
check_code "GET /shipments/:id not found" "$R" "404"

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TAB: OVERVIEW (Analytics + Routes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 24. GET shipment analytics
R=$(curl -s "$TR/shipments/analytics?startDate=2026-01-01&endDate=2026-12-31" -H "$H")
TOTAL=$(echo "$R" | jq -r '.totalShipments' 2>/dev/null)
if [ -n "$TOTAL" ] && [ "$TOTAL" != "null" ]; then
  pass "GET /shipments/analytics → totalShipments=$TOTAL"
  echo "  ℹ  deliveryRate=$(echo "$R" | jq -r '.deliveryRate')%"
  echo "  ℹ  totalCost=$(echo "$R" | jq -r '.totalCost')"
  echo "  ℹ  byStatus=$(echo "$R" | jq -c '.byStatus')"
else fail "GET /shipments/analytics" "$R"; fi

# 25. CREATE delivery route
R=$(curl -s -X POST "$TR/routes" -H "$H" -H "Content-Type: application/json" -d '{
  "courier_id": "'"$COURIER_ID"'",
  "shipment_ids": ["'"$SHIPMENT_ID"'"],
  "route_date": "2026-03-20"
}')
ROUTE_ID=$(echo "$R" | jq -r '.id')
ROUTE_NUM=$(echo "$R" | jq -r '.route_number')
check_id "POST /routes (create delivery route)" "$R"
echo "  ℹ  route_number auto-generated: $ROUTE_NUM"

# 26. UPDATE route status → in_progress (sets start_time)
R=$(curl -s -X PUT "$TR/routes/$ROUTE_ID/status" -H "$H" -H "Content-Type: application/json" -d '{"status":"in_progress"}')
check_field "PUT /routes/:id/status → in_progress" "$R" ".status" "in_progress"
START_TIME=$(echo "$R" | jq -r '.start_time')
if [ -n "$START_TIME" ] && [ "$START_TIME" != "null" ]; then pass "route start_time auto-set"
else fail "route start_time not set" "$R"; fi

# 27. UPDATE route status → completed (sets end_time + actual_duration)
R=$(curl -s -X PUT "$TR/routes/$ROUTE_ID/status" -H "$H" -H "Content-Type: application/json" -d '{"status":"completed"}')
check_field "PUT /routes/:id/status → completed" "$R" ".status" "completed"
END_TIME=$(echo "$R" | jq -r '.end_time')
if [ -n "$END_TIME" ] && [ "$END_TIME" != "null" ]; then pass "route end_time auto-set"
else fail "route end_time not set" "$R"; fi

# 28. Route not found
R=$(curl -s -X PUT "$TR/routes/00000000-0000-0000-0000-000000000000/status" -H "$H" \
  -H "Content-Type: application/json" -d '{"status":"in_progress"}')
check_code "PUT /routes/:id/status not found" "$R" "404"

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  COURIER DELETE GUARD (active shipments)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 29. Create a shipment in_transit for courier2 to test delete guard
R=$(curl -s -X POST "$TR/shipments" -H "$H" -H "Content-Type: application/json" -d '{
  "courier_id": "'"$COURIER2_ID"'",
  "origin_name": "Depot",
  "origin_address": "1 Depot Rd",
  "destination_name": "Client",
  "destination_address": "99 Client St",
  "items": [{"product_name": "Widget", "quantity": 5}]
}')
GUARD_SHIPMENT_ID=$(echo "$R" | jq -r '.id')
check_id "POST /shipments (for delete guard test)" "$R"

# Move it to in_transit
curl -s -X PUT "$TR/shipments/$GUARD_SHIPMENT_ID/status" -H "$H" \
  -H "Content-Type: application/json" -d '{"status":"in_transit"}' > /dev/null

# 30. Try to delete courier2 with active shipment → 400
R=$(curl -s -X DELETE "$TR/couriers/$COURIER2_ID" -H "$H")
check_code "DELETE /couriers/:id with active shipments → 400" "$R" "400"

# Cancel the shipment first
curl -s -X PUT "$TR/shipments/$GUARD_SHIPMENT_ID/status" -H "$H" \
  -H "Content-Type: application/json" -d '{"status":"cancelled"}' > /dev/null

# 31. Now delete courier2 (no active shipments)
R=$(curl -s -X DELETE "$TR/couriers/$COURIER2_ID" -H "$H")
MSG=$(echo "$R" | jq -r '.message')
if [ "$MSG" = "Courier deleted successfully" ]; then pass "DELETE /couriers/:id (after cancelling shipments)"
else fail "DELETE /couriers/:id" "$R"; fi

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CLEANUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 32. DELETE courier1 (no active shipments - all delivered/cancelled)
R=$(curl -s -X DELETE "$TR/couriers/$COURIER_ID" -H "$H")
MSG=$(echo "$R" | jq -r '.message')
if [ "$MSG" = "Courier deleted successfully" ]; then pass "DELETE /couriers/:id (cleanup)"
else fail "DELETE /couriers/:id cleanup" "$R"; fi

# 33. Verify courier deleted
R=$(curl -s "$TR/couriers/$COURIER_ID" -H "$H")
check_code "GET deleted courier → 404 confirmed" "$R" "404"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                   TEST COMPLETE                      ║"
echo "╚══════════════════════════════════════════════════════╝"
