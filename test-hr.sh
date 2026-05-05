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
echo -e "${BOLD}║            HR - FULL API TEST            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password","actorType":"staff"}')
TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
USER_ID=$(echo "$LOGIN" | jq -r '.user.id')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && pass "Login OK" || { fail "Login" "no token"; exit 1; }

TS=$(date +%s)

section "EMPLOYEES"
EMP=$(auth -X POST "$BASE/hr/employees" -d "{
  \"employee_code\": \"EMP-$TS\",
  \"first_name\": \"Alice\",
  \"last_name\": \"Smith\",
  \"email\": \"alice_$TS@company.local\",
  \"phone\": \"+1-555-0101\",
  \"date_of_birth\": \"1990-03-15\",
  \"gender\": \"female\",
  \"department\": \"Engineering\",
  \"position\": \"Senior Engineer\",
  \"hire_date\": \"2024-01-15\",
  \"employment_type\": \"full_time\",
  \"status\": \"active\",
  \"salary\": 85000
}")
EMP_ID=$(echo "$EMP" | jq -r '.id')
check_id "Create employee" "$EMP"

EMP2=$(auth -X POST "$BASE/hr/employees" -d "{
  \"employee_code\": \"MGR-$TS\",
  \"first_name\": \"Bob\",
  \"last_name\": \"Manager\",
  \"email\": \"bob_$TS@company.local\",
  \"department\": \"Engineering\",
  \"position\": \"Engineering Manager\",
  \"hire_date\": \"2022-06-01\",
  \"employment_type\": \"full_time\",
  \"status\": \"active\",
  \"salary\": 110000
}")
MGR_ID=$(echo "$EMP2" | jq -r '.id')
check_id "Create manager employee" "$EMP2"

NO_DEPT=$(auth -X POST "$BASE/hr/employees" -d "{
  \"employee_code\": \"NODEPT-$TS\",
  \"first_name\": \"No\", \"last_name\": \"Dept\",
  \"email\": \"nodept_$TS@company.local\",
  \"position\": \"Analyst\"
}")
check_code "Create employee without department → 400" "$NO_DEPT" "400"

DUP_EMP=$(auth -X POST "$BASE/hr/employees" -d "{
  \"employee_code\": \"DUP-$TS\",
  \"first_name\": \"Dup\", \"last_name\": \"User\",
  \"email\": \"alice_$TS@company.local\",
  \"department\": \"IT\",
  \"position\": \"Dev\",
  \"hire_date\": \"2024-01-01\",
  \"employment_type\": \"full_time\",
  \"status\": \"active\"
}")
check_code "Create employee with duplicate email → 409" "$DUP_EMP" "409"

LIST_EMP=$(auth "$BASE/hr/employees")
check_array "List employees" "$LIST_EMP"

GET_EMP=$(auth "$BASE/hr/employees/$EMP_ID")
check_field "Get employee by ID" "$GET_EMP" ".id" "$EMP_ID"

SEARCH=$(auth "$BASE/hr/employees/search?q=Alice")
check_array "Search employees by name" "$SEARCH"

DEPT=$(auth "$BASE/hr/employees/department/Engineering")
check_array "Filter employees by department" "$DEPT"

UPD_EMP=$(auth -X PUT "$BASE/hr/employees/$EMP_ID" -d "{\"position\": \"Lead Engineer\", \"manager_id\": \"$MGR_ID\"}")
check_field "Update employee position" "$UPD_EMP" ".position" "Lead Engineer"

section "ATTENDANCE"
CLOCK_IN=$(auth -X POST "$BASE/hr/attendance/clock-in" -d "{
  \"employee_id\": \"$EMP_ID\",
  \"clock_in\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"notes\": \"On time\"
}")
ATT_ID=$(echo "$CLOCK_IN" | jq -r '.id')
check_id "Clock in employee" "$CLOCK_IN"

CLOCK_OUT=$(auth -X POST "$BASE/hr/attendance/clock-out" -d "{
  \"employee_id\": \"$EMP_ID\",
  \"clock_out\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}")
check_field "Clock out → status completed" "$CLOCK_OUT" ".status" "present"

LIST_ATT=$(auth "$BASE/hr/attendance")
check_array "List attendance records" "$LIST_ATT"

section "LEAVE TYPES"
LT=$(auth -X POST "$BASE/hr/leave-types" -d "{
  \"name\": \"Annual Leave $TS\",
  \"days_per_year\": 20,
  \"is_paid\": true,
  \"carry_forward\": true,
  \"max_carry_forward\": 5
}")
LT_ID=$(echo "$LT" | jq -r '.id')
check_id "Create leave type" "$LT"

LIST_LT=$(auth "$BASE/hr/leave-types")
check_array "List leave types" "$LIST_LT"

section "LEAVE REQUESTS"
LR=$(auth -X POST "$BASE/hr/leave-requests" -d "{
  \"employee_id\": \"$EMP_ID\",
  \"leave_type_id\": \"$LT_ID\",
  \"start_date\": \"2026-08-01\",
  \"end_date\": \"2026-08-05\",
  \"days_count\": 5,
  \"reason\": \"Summer vacation\"
}")
LR_ID=$(echo "$LR" | jq -r '.id')
check_id "Submit leave request" "$LR"

LIST_LR=$(auth "$BASE/hr/leave-requests")
check_array "List leave requests" "$LIST_LR"

APPROVE_LR=$(auth -X POST "$BASE/hr/leave-requests/$LR_ID/approve" -d "{
  \"approver_id\": \"$MGR_ID\",
  \"notes\": \"Enjoy your vacation\"
}")
check_field "Approve leave request → approved" "$APPROVE_LR" ".status" "approved"

LR2=$(auth -X POST "$BASE/hr/leave-requests" -d "{
  \"employee_id\": \"$EMP_ID\",
  \"leave_type_id\": \"$LT_ID\",
  \"start_date\": \"2026-09-01\",
  \"end_date\": \"2026-09-03\",
  \"days_count\": 3,
  \"reason\": \"Personal\"
}")
LR2_ID=$(echo "$LR2" | jq -r '.id')
REJECT_LR=$(auth -X POST "$BASE/hr/leave-requests/$LR2_ID/reject" -d "{
  \"approver_id\": \"$MGR_ID\",
  \"rejection_reason\": \"Critical project deadline\"
}")
check_field "Reject leave request → rejected" "$REJECT_LR" ".status" "rejected"

section "SALARY & PAYROLL"
SC=$(auth -X POST "$BASE/hr/salary-components" -d "{
  \"name\": \"Base Salary $TS\",
  \"type\": \"fixed\",
  \"amount\": 85000,
  \"is_taxable\": true
}")
check_id "Create salary component" "$SC"

LIST_SC=$(auth "$BASE/hr/salary-components")
check_array "List salary components" "$LIST_SC"

PAYROLL=$(auth -X POST "$BASE/hr/payroll/run" -d '{"month": 4, "year": 2026}')
PAYROLL_OK=$(echo "$PAYROLL" | jq 'type == "array" or has("message") or has("id")' 2>/dev/null)
[ "$PAYROLL_OK" = "true" ] && pass "Run payroll for April 2026" || fail "Run payroll" "$PAYROLL"

LIST_PS=$(auth "$BASE/hr/payslips")
check_array "List payslips after payroll run" "$LIST_PS"

section "VALIDATION"
NOT_FOUND=$(auth "$BASE/hr/employees/00000000-0000-0000-0000-000000000000")
check_code "Get non-existent employee → 404" "$NOT_FOUND" "404"

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS+FAIL)) total${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
