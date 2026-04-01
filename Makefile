.PHONY: dev prod stop down build logs ps

# ── Dev ───────────────────────────────────────────────────────
dev:
	@[ -f .env ] || cp .env.example .env
	docker compose -f docker-compose.dev.yml up -d

dev-build:
	@[ -f .env ] || cp .env.example .env
	docker compose -f docker-compose.dev.yml build --no-cache
	docker compose -f docker-compose.dev.yml up -d

# ── Prod ──────────────────────────────────────────────────────
prod:
	@[ -f .env ] || cp .env.example .env
	docker compose up -d

prod-build:
	@[ -f .env ] || cp .env.example .env
	docker compose build --no-cache
	docker compose up -d

# ── Stop / Clean ──────────────────────────────────────────────
stop:
	docker compose -f docker-compose.dev.yml stop
	docker compose stop

down:
	docker compose -f docker-compose.dev.yml down
	docker compose down

down-volumes:
	docker compose -f docker-compose.dev.yml down -v
	docker compose down -v

# ── Logs ──────────────────────────────────────────────────────
logs:
	docker compose -f docker-compose.dev.yml logs -f

logs-backend:
	docker compose -f docker-compose.dev.yml logs -f backend

logs-frontend:
	docker compose -f docker-compose.dev.yml logs -f frontend

# ── Status ────────────────────────────────────────────────────
ps:
	docker compose -f docker-compose.dev.yml ps

# ── k6 Load Tests ─────────────────────────────────────────────────────────────
# Usage: make k6-platform BASE_URL=http://localhost:3000 TENANT_ID=your-id
BASE_URL  ?= http://localhost:3000
TENANT_ID ?=
EMAIL     ?= admin@platform.local
PASSWORD  ?= Admin@123456

k6-platform:
	k6 run backend/k6-tests/platform-test.js \
	  -e BASE_URL=$(BASE_URL) \
	  -e TENANT_ID=$(TENANT_ID) \
	  -e EMAIL=$(EMAIL) \
	  -e PASSWORD=$(PASSWORD)

k6-stress:
	k6 run backend/k6-tests/stress-test.js -e BASE_URL=$(BASE_URL)

k6-spike:
	k6 run backend/k6-tests/spike-test.js -e BASE_URL=$(BASE_URL)

k6-all:
	$(MAKE) k6-platform BASE_URL=$(BASE_URL) TENANT_ID=$(TENANT_ID)
	$(MAKE) k6-stress   BASE_URL=$(BASE_URL)
	$(MAKE) k6-spike    BASE_URL=$(BASE_URL)
