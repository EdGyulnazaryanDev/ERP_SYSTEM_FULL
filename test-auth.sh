#!/bin/bash
BASE="http://localhost:3100/api"
PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'
pass() { echo -e "${GREEN}✓ PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗ FAIL${NC} $1 → $2"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${BOLD}${YELLOW}=== $1 ===${NC}"; }
check_id()    { local id=$(echo "$2"|jq -r '.id' 2>/dev/null); [ -n "$id" ] && [ "$id" != "null" ] && pass "$1 (id=${id:0:8}...)" || fail "$1" "$2"; }
check_field() { local v=$(echo "$2"|jq -r "$3" 2>/dev/null); [ "$v" = "$4" ] && pass "$1 ($3=$v)" || fail "$1 (expected $3=$4, got $v)" "$2"; }
check_code()  { local c=$(echo "$2"|jq -r '.statusCode' 2>/dev/null); [ "$c" = "$3" ] && pass "$1 → HTTP $c" || fail "$1 (expected $3, got $c)" "$2"; }
auth() { curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

TS=$(date +%s)
EMAIL="auth_test_${TS}@test.local"
PASSWORD="Test@123456"

echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║          AUTH - FULL API TEST            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

section "REGISTER"
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"companyName\": \"TestCo_$TS\",
  \"email\": \"$EMAIL\",
  \"password\": \"$PASSWORD\",
  \"confirmPassword\": \"$PASSWORD\",
  \"firstName\": \"Test\",
  \"lastName\": \"User\"
}")
TOKEN=$(echo "$REG" | jq -r '.accessToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Register → accessToken issued" || fail "Register" "$REG"

REG_REFRESH=$(echo "$REG" | jq -r '.refreshToken')
[ -n "$REG_REFRESH" ] && [ "$REG_REFRESH" != "null" ] && pass "Register → refreshToken issued" || fail "Register refreshToken" "$REG"

MISMATCH=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"companyName\": \"MismatchCo\",
  \"email\": \"mismatch_${TS}@test.local\",
  \"password\": \"$PASSWORD\",
  \"confirmPassword\": \"WrongPass\",
  \"firstName\": \"A\", \"lastName\": \"B\"
}")
check_code "Register with mismatched passwords → 400" "$MISMATCH" "400"

DUP=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"companyName\": \"DupCo\",
  \"email\": \"$EMAIL\",
  \"password\": \"$PASSWORD\",
  \"confirmPassword\": \"$PASSWORD\",
  \"firstName\": \"A\", \"lastName\": \"B\"
}")
check_code "Register duplicate email → 409" "$DUP" "409"

section "LOGIN"
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{
  \"email\": \"$EMAIL\",
  \"password\": \"$PASSWORD\",
  \"actorType\": \"staff\"
}")
TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN" | jq -r '.refreshToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login → accessToken issued" || { fail "Login" "$LOGIN"; exit 1; }
[ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ] && pass "Login → refreshToken issued" || fail "Login refreshToken" "$LOGIN"

WRONG_PASS=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{
  \"email\": \"$EMAIL\", \"password\": \"wrongpassword\", \"actorType\": \"staff\"
}")
check_code "Login wrong password → 401" "$WRONG_PASS" "401"

UNKNOWN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{
  \"email\": \"nobody_${TS}@nowhere.local\", \"password\": \"$PASSWORD\", \"actorType\": \"staff\"
}")
check_code "Login unknown email → 401" "$UNKNOWN" "401"

section "GET ME"
ME=$(auth "$BASE/auth/me")
check_field "GET /auth/me returns correct email" "$ME" ".email" "$EMAIL"

NO_TOKEN=$(curl -s "$BASE/auth/me")
check_code "GET /auth/me without token → 401" "$NO_TOKEN" "401"

BAD_TOKEN=$(curl -s -H "Authorization: Bearer badtoken" "$BASE/auth/me")
check_code "GET /auth/me with invalid token → 401" "$BAD_TOKEN" "401"

section "REFRESH TOKEN"
NEW_TOKENS=$(curl -s -X POST "$BASE/auth/refresh" -H "Content-Type: application/json" -d "{
  \"refreshToken\": \"$REFRESH_TOKEN\"
}")
NEW_AT=$(echo "$NEW_TOKENS" | jq -r '.accessToken')
[ -n "$NEW_AT" ] && [ "$NEW_AT" != "null" ] && pass "Refresh → new accessToken issued" || fail "Refresh token" "$NEW_TOKENS"

BAD_REFRESH=$(curl -s -X POST "$BASE/auth/refresh" -H "Content-Type: application/json" -d '{"refreshToken":"invalid-token"}')
check_code "Refresh with invalid token → 401" "$BAD_REFRESH" "401"

section "LOGOUT"
LOGOUT=$(auth -X POST "$BASE/auth/logout")
LOGOUT_MSG=$(echo "$LOGOUT" | jq -r '.message')
[ -n "$LOGOUT_MSG" ] && pass "Logout → message returned" || fail "Logout" "$LOGOUT"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
