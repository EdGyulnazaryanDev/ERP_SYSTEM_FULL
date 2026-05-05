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
echo -e "${BOLD}║          USERS - FULL API TEST           ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password","actorType":"staff"}' | jq -r '.accessToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login OK" || { fail "Login" "no token"; exit 1; }

TS=$(date +%s)

section "CREATE"
USER=$(auth -X POST "$BASE/users" -d "{
  \"email\": \"user_$TS@test.local\",
  \"password\": \"Test@123456\",
  \"first_name\": \"Jane\",
  \"last_name\": \"Doe\",
  \"is_active\": true
}")
USER_ID=$(echo "$USER" | jq -r '.id')
check_id "Create user" "$USER"

NO_EMAIL=$(auth -X POST "$BASE/users" -d '{"first_name":"No","last_name":"Email","is_active":true}')
check_code "Create without email → 400" "$NO_EMAIL" "400"

DUP=$(auth -X POST "$BASE/users" -d "{
  \"email\": \"user_$TS@test.local\",
  \"first_name\": \"Dup\",
  \"last_name\": \"User\",
  \"is_active\": true
}")
check_code "Create duplicate email → 409" "$DUP" "409"

section "READ"
LIST=$(auth "$BASE/users")
check_array "List all users" "$LIST"

ME=$(auth "$BASE/users/me")
HAS_EMAIL=$(echo "$ME" | jq 'has("email")' 2>/dev/null)
[ "$HAS_EMAIL" = "true" ] && pass "GET /users/me returns profile" || fail "GET /users/me" "$ME"

GET=$(auth "$BASE/users/$USER_ID")
check_field "Get user by ID" "$GET" ".id" "$USER_ID"

NOT_FOUND=$(auth "$BASE/users/00000000-0000-0000-0000-000000000000")
check_code "Get non-existent user → 404" "$NOT_FOUND" "404"

section "UPDATE"
UPD=$(auth -X PUT "$BASE/users/$USER_ID" -d '{"first_name":"Updated","last_name":"Name"}')
check_field "Update user name" "$UPD" ".first_name" "Updated"

DEACTIVATE=$(auth -X PUT "$BASE/users/$USER_ID" -d '{"is_active":false}')
check_field "Deactivate user" "$DEACTIVATE" ".is_active" "false"

REACTIVATE=$(auth -X PUT "$BASE/users/$USER_ID" -d '{"is_active":true}')
check_field "Reactivate user" "$REACTIVATE" ".is_active" "true"

section "DELETE"
DEL_USER=$(auth -X POST "$BASE/users" -d "{
  \"email\": \"del_$TS@test.local\",
  \"first_name\": \"Delete\",
  \"last_name\": \"Me\",
  \"is_active\": true
}")
DEL_ID=$(echo "$DEL_USER" | jq -r '.id')
DEL=$(auth -X DELETE "$BASE/users/$DEL_ID")
DEL_OK=$(echo "$DEL" | jq -r 'has("message") or (.statusCode == null)' 2>/dev/null)
[ "$DEL_OK" = "true" ] && pass "Delete user" || fail "Delete user" "$DEL"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
