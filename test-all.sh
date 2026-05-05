#!/bin/bash
BASE_URL="${BASE_URL:-http://localhost:3100/api}"
BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_SUITES=()

DIR="$(cd "$(dirname "$0")" && pwd)"

run_suite() {
  local name="$1"
  local script="$2"
  echo -e "\n${CYAN}${BOLD}▶ Running: $name${NC}"
  output=$(bash "$DIR/$script" 2>&1)
  exit_code=$?
  passed=$(echo "$output" | grep -c "✓ PASS" || true)
  failed=$(echo "$output" | grep -c "✗ FAIL" || true)
  TOTAL_PASS=$((TOTAL_PASS + passed))
  TOTAL_FAIL=$((TOTAL_FAIL + failed))
  if [ $exit_code -eq 0 ]; then
    echo -e "  ${GREEN}✓ $name — $passed passed${NC}"
  else
    echo -e "  ${RED}✗ $name — $passed passed, $failed failed${NC}"
    FAILED_SUITES+=("$name")
    if [ "${VERBOSE:-0}" = "1" ]; then
      echo "$output" | grep "✗ FAIL"
    fi
  fi
}

echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           ERP SYSTEM — FULL TEST SUITE           ║${NC}"
echo -e "${BOLD}║        BASE: $BASE_URL${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo -e "  Run with ${YELLOW}VERBOSE=1 ./test-all.sh${NC} to see failure details"

# ── Connectivity check ──────────────────────────────────────────────────────
echo -e "\n${YELLOW}=== CONNECTIVITY ===${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/../health" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
  echo -e "  ${GREEN}✓ Backend reachable${NC}"
else
  echo -e "  ${YELLOW}⚠ Health check returned $STATUS (continuing anyway)${NC}"
fi

# ── Run all suites ───────────────────────────────────────────────────────────
run_suite "Auth"            "test-auth.sh"
run_suite "Users"           "test-users.sh"
run_suite "Inventory"       "test-inventory.sh"
run_suite "CRM"             "test-crm.sh"
run_suite "Procurement"     "test-procurement.sh"
run_suite "HR"              "test-hr.sh"
run_suite "Accounting"      "test-accounting.sh"
run_suite "Warehouse"       "test-warehouse.sh"
run_suite "Transportation"  "test-transportation.sh"
run_suite "Manufacturing"   "test-manufacturing.sh"
run_suite "Projects"        "test-project-management.sh"

# ── Summary ──────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}TOTAL: ${GREEN}$TOTAL_PASS passed${NC} / ${RED}$TOTAL_FAIL failed${NC} / $((TOTAL_PASS + TOTAL_FAIL)) total${NC}"

if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
  echo -e "\n${RED}${BOLD}Failed suites:${NC}"
  for s in "${FAILED_SUITES[@]}"; do
    echo -e "  ${RED}✗ $s${NC}"
  done
  echo -e "\n  Run ${YELLOW}VERBOSE=1 ./test-all.sh${NC} to see individual failures"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
else
  echo -e "\n${GREEN}${BOLD}All suites passed!${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
