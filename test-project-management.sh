#!/bin/bash
set -e

BASE="http://localhost:3100/api"
PM="$BASE/project-management"

# ── Auth ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         PROJECT MANAGEMENT - FULL API TEST           ║"
echo "╚══════════════════════════════════════════════════════╝"

TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ LOGIN FAILED"
  exit 1
fi
echo "✅ LOGIN OK"
H="Authorization: Bearer $TOKEN"
ADMIN_ID="7992cbbc-c1c4-484b-ac48-9c4b5a230fcd"
UNIQUE="$(date +%s)"

pass() { echo "  ✅ PASS: $1"; }
fail() { echo "  ❌ FAIL: $1"; echo "     Response: $2"; }
check() {
  local label="$1"
  local resp="$2"
  local expect_field="$3"
  local val=$(echo "$resp" | jq -r "$expect_field" 2>/dev/null)
  if [ "$val" != "null" ] && [ -n "$val" ]; then
    pass "$label → $val"
  else
    fail "$label" "$resp"
  fi
}

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PROJECTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. GET all projects
R=$(curl -s -X GET "$PM/projects" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 0 ]; then pass "GET /projects → $COUNT projects"; else fail "GET /projects" "$R"; fi

# 2. CREATE project
R=$(curl -s -X POST "$PM/projects" -H "$H" -H "Content-Type: application/json" -d '{
  "project_name": "Test ERP Project",
  "project_code": "TEST-$UNIQUE",
  "description": "Full functional test project",
  "status": "planning",
  "priority": "high",
  "project_manager_id": "'"$ADMIN_ID"'",
  "start_date": "2026-04-01",
  "end_date": "2026-12-31",
  "estimated_budget": 50000,
  "estimated_hours": 500,
  "tags": ["erp","test"]
}')
PROJECT_ID=$(echo "$R" | jq -r '.id')
check "POST /projects (create)" "$R" ".id"

# 3. GET project by ID
R=$(curl -s -X GET "$PM/projects/$PROJECT_ID" -H "$H")
check "GET /projects/:id" "$R" ".project_name"

# 4. UPDATE project
R=$(curl -s -X PUT "$PM/projects/$PROJECT_ID" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "in_progress",
  "progress_percentage": 10,
  "notes": "Updated via test"
}')
STATUS=$(echo "$R" | jq -r '.status')
if [ "$STATUS" = "in_progress" ]; then pass "PUT /projects/:id → status=$STATUS"; else fail "PUT /projects/:id" "$R"; fi

# 5. GET projects by manager
R=$(curl -s -X GET "$PM/projects/manager/$ADMIN_ID" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 0 ]; then pass "GET /projects/manager/:id → $COUNT projects"; else fail "GET /projects/manager/:id" "$R"; fi

# 6. GET project budget (empty)
R=$(curl -s -X GET "$PM/projects/$PROJECT_ID/budget" -H "$H")
if echo "$R" | jq -e 'type=="array"' > /dev/null 2>&1; then pass "GET /projects/:id/budget → array"; else fail "GET /projects/:id/budget" "$R"; fi

# 7. GET gantt chart
R=$(curl -s -X GET "$PM/projects/$PROJECT_ID/gantt" -H "$H")
if echo "$R" | jq -e 'type=="array"' > /dev/null 2>&1; then pass "GET /projects/:id/gantt → array"; else fail "GET /projects/:id/gantt" "$R"; fi

# 8. CREATE project - validation error (missing required fields)
R=$(curl -s -X POST "$PM/projects" -H "$H" -H "Content-Type: application/json" -d '{"description":"missing required"}')
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "400" ]; then pass "POST /projects validation error → 400"; else fail "POST /projects validation (expected 400)" "$R"; fi

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MILESTONES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 9. GET all milestones
R=$(curl -s -X GET "$PM/milestones" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 0 ]; then pass "GET /milestones → $COUNT milestones"; else fail "GET /milestones" "$R"; fi

# 10. CREATE milestone
R=$(curl -s -X POST "$PM/milestones" -H "$H" -H "Content-Type: application/json" -d '{
  "project_id": "'"$PROJECT_ID"'",
  "milestone_name": "Phase 1 Complete",
  "description": "First phase done",
  "due_date": "2026-06-30",
  "status": "pending",
  "sort_order": 1
}')
MILESTONE_ID=$(echo "$R" | jq -r '.id')
check "POST /milestones (create)" "$R" ".id"

# 11. GET milestones by project
R=$(curl -s -X GET "$PM/milestones?projectId=$PROJECT_ID" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 1 ]; then pass "GET /milestones?projectId → $COUNT milestones"; else fail "GET /milestones?projectId" "$R"; fi

# 12. GET milestone by ID
R=$(curl -s -X GET "$PM/milestones/$MILESTONE_ID" -H "$H")
check "GET /milestones/:id" "$R" ".milestone_name"

# 13. UPDATE milestone
R=$(curl -s -X PUT "$PM/milestones/$MILESTONE_ID" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "in_progress",
  "description": "Updated milestone"
}')
MS=$(echo "$R" | jq -r '.status')
if [ "$MS" = "in_progress" ]; then pass "PUT /milestones/:id → status=$MS"; else fail "PUT /milestones/:id" "$R"; fi

# 14. CREATE milestone - validation error
R=$(curl -s -X POST "$PM/milestones" -H "$H" -H "Content-Type: application/json" -d '{"milestone_name":"no project"}')
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "400" ]; then pass "POST /milestones validation error → 400"; else fail "POST /milestones validation (expected 400)" "$R"; fi

# 15. GET milestone not found
R=$(curl -s -X GET "$PM/milestones/00000000-0000-0000-0000-000000000000" -H "$H")
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "404" ]; then pass "GET /milestones/:id not found → 404"; else fail "GET /milestones/:id not found (expected 404)" "$R"; fi

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TASKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 16. GET all tasks
R=$(curl -s -X GET "$PM/tasks" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 0 ]; then pass "GET /tasks → $COUNT tasks"; else fail "GET /tasks" "$R"; fi

# 17. CREATE task
R=$(curl -s -X POST "$PM/tasks" -H "$H" -H "Content-Type: application/json" -d '{
  "project_id": "'"$PROJECT_ID"'",
  "task_code": "TASK-$UNIQUE-1",
  "task_name": "Setup database schema",
  "description": "Create all required tables",
  "status": "todo",
  "priority": "high",
  "assigned_to": "'"$ADMIN_ID"'",
  "milestone_id": "'"$MILESTONE_ID"'",
  "start_date": "2026-04-01",
  "due_date": "2026-04-15",
  "estimated_hours": 20,
  "tags": ["backend","db"]
}')
TASK_ID=$(echo "$R" | jq -r '.id')
check "POST /tasks (create)" "$R" ".id"

# 18. CREATE subtask (parent_task_id)
R=$(curl -s -X POST "$PM/tasks" -H "$H" -H "Content-Type: application/json" -d '{
  "project_id": "'"$PROJECT_ID"'",
  "task_code": "TASK-$UNIQUE-2",
  "task_name": "Create users table",
  "status": "todo",
  "priority": "medium",
  "parent_task_id": "'"$TASK_ID"'",
  "estimated_hours": 5
}')
SUBTASK_ID=$(echo "$R" | jq -r '.id')
check "POST /tasks (subtask with parent_task_id)" "$R" ".id"

# 19. GET tasks by project
R=$(curl -s -X GET "$PM/tasks?projectId=$PROJECT_ID" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 1 ]; then pass "GET /tasks?projectId → $COUNT tasks"; else fail "GET /tasks?projectId" "$R"; fi

# 20. GET task by ID
R=$(curl -s -X GET "$PM/tasks/$TASK_ID" -H "$H")
check "GET /tasks/:id" "$R" ".task_name"

# 21. GET tasks by assignee
R=$(curl -s -X GET "$PM/tasks/assignee/$ADMIN_ID" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 0 ]; then pass "GET /tasks/assignee/:id → $COUNT tasks"; else fail "GET /tasks/assignee/:id" "$R"; fi

# 22. UPDATE task
R=$(curl -s -X PUT "$PM/tasks/$TASK_ID" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "in_progress",
  "progress_percentage": 25,
  "actual_hours": 5
}')
TS=$(echo "$R" | jq -r '.status')
if [ "$TS" = "in_progress" ]; then pass "PUT /tasks/:id → status=$TS"; else fail "PUT /tasks/:id" "$R"; fi

# 23. UPDATE task to completed
R=$(curl -s -X PUT "$PM/tasks/$TASK_ID" -H "$H" -H "Content-Type: application/json" -d '{
  "status": "completed",
  "progress_percentage": 100,
  "completed_date": "2026-04-14",
  "actual_hours": 18
}')
TS=$(echo "$R" | jq -r '.status')
if [ "$TS" = "completed" ]; then pass "PUT /tasks/:id → completed"; else fail "PUT /tasks/:id completed" "$R"; fi

# 24. CREATE task - validation error
R=$(curl -s -X POST "$PM/tasks" -H "$H" -H "Content-Type: application/json" -d '{"task_name":"no project"}')
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "400" ]; then pass "POST /tasks validation error → 400"; else fail "POST /tasks validation (expected 400)" "$R"; fi

# 25. GET task not found
R=$(curl -s -X GET "$PM/tasks/00000000-0000-0000-0000-000000000000" -H "$H")
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "404" ]; then pass "GET /tasks/:id not found → 404"; else fail "GET /tasks/:id not found (expected 404)" "$R"; fi

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESOURCES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 26. GET all resources
R=$(curl -s -X GET "$PM/resources" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 0 ]; then pass "GET /resources → $COUNT resources"; else fail "GET /resources" "$R"; fi

# 27. CREATE resource
R=$(curl -s -X POST "$PM/resources" -H "$H" -H "Content-Type: application/json" -d '{
  "project_id": "'"$PROJECT_ID"'",
  "employee_id": "'"$ADMIN_ID"'",
  "role": "project_manager",
  "allocation_start_date": "2026-04-01",
  "allocation_end_date": "2026-12-31",
  "allocation_percentage": 80,
  "hourly_rate": 75.00
}')
RESOURCE_ID=$(echo "$R" | jq -r '.id')
check "POST /resources (create)" "$R" ".id"

# 28. GET resources by project
R=$(curl -s -X GET "$PM/resources?projectId=$PROJECT_ID" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 1 ]; then pass "GET /resources?projectId → $COUNT resources"; else fail "GET /resources?projectId" "$R"; fi

# 29. GET resource by ID
R=$(curl -s -X GET "$PM/resources/$RESOURCE_ID" -H "$H")
check "GET /resources/:id" "$R" ".role"

# 30. UPDATE resource
R=$(curl -s -X PUT "$PM/resources/$RESOURCE_ID" -H "$H" -H "Content-Type: application/json" -d '{
  "allocation_percentage": 100,
  "hourly_rate": 85.00,
  "role": "team_lead"
}')
ROLE=$(echo "$R" | jq -r '.role')
if [ "$ROLE" = "team_lead" ]; then pass "PUT /resources/:id → role=$ROLE"; else fail "PUT /resources/:id" "$R"; fi

# 31. CREATE resource - validation error
R=$(curl -s -X POST "$PM/resources" -H "$H" -H "Content-Type: application/json" -d '{"role":"developer"}')
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "400" ]; then pass "POST /resources validation error → 400"; else fail "POST /resources validation (expected 400)" "$R"; fi

# 32. GET resource not found
R=$(curl -s -X GET "$PM/resources/00000000-0000-0000-0000-000000000000" -H "$H")
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "404" ]; then pass "GET /resources/:id not found → 404"; else fail "GET /resources/:id not found (expected 404)" "$R"; fi

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GANTT CHART (with tasks)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

R=$(curl -s -X GET "$PM/projects/$PROJECT_ID/gantt" -H "$H")
COUNT=$(echo "$R" | jq 'if type=="array" then length else -1 end')
if [ "$COUNT" -ge 1 ]; then pass "GET /projects/:id/gantt → $COUNT tasks in gantt"; else fail "GET /projects/:id/gantt" "$R"; fi

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CLEANUP (DELETE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 33. DELETE subtask
R=$(curl -s -X DELETE "$PM/tasks/$SUBTASK_ID" -H "$H")
MSG=$(echo "$R" | jq -r '.message')
if [ "$MSG" = "Task deleted successfully" ]; then pass "DELETE /tasks/:id (subtask)"; else fail "DELETE /tasks/:id (subtask)" "$R"; fi

# 34. DELETE task
R=$(curl -s -X DELETE "$PM/tasks/$TASK_ID" -H "$H")
MSG=$(echo "$R" | jq -r '.message')
if [ "$MSG" = "Task deleted successfully" ]; then pass "DELETE /tasks/:id"; else fail "DELETE /tasks/:id" "$R"; fi

# 35. DELETE resource
R=$(curl -s -X DELETE "$PM/resources/$RESOURCE_ID" -H "$H")
MSG=$(echo "$R" | jq -r '.message')
if [ "$MSG" = "Resource deleted successfully" ]; then pass "DELETE /resources/:id"; else fail "DELETE /resources/:id" "$R"; fi

# 36. DELETE milestone
R=$(curl -s -X DELETE "$PM/milestones/$MILESTONE_ID" -H "$H")
MSG=$(echo "$R" | jq -r '.message')
if [ "$MSG" = "Milestone deleted successfully" ]; then pass "DELETE /milestones/:id"; else fail "DELETE /milestones/:id" "$R"; fi

# 37. DELETE project
R=$(curl -s -X DELETE "$PM/projects/$PROJECT_ID" -H "$H")
MSG=$(echo "$R" | jq -r '.message')
if [ "$MSG" = "Project deleted successfully" ]; then pass "DELETE /projects/:id"; else fail "DELETE /projects/:id" "$R"; fi

# 38. Verify project deleted (404)
R=$(curl -s -X GET "$PM/projects/$PROJECT_ID" -H "$H")
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "404" ]; then pass "GET deleted project → 404 confirmed"; else fail "GET deleted project (expected 404)" "$R"; fi

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AUTH GUARD TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 39. No token → 401
R=$(curl -s -X GET "$PM/projects")
CODE=$(echo "$R" | jq -r '.statusCode')
if [ "$CODE" = "401" ]; then pass "GET /projects without token → 401"; else fail "GET /projects without token (expected 401)" "$R"; fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                   TEST COMPLETE                      ║"
echo "╚══════════════════════════════════════════════════════╝"
