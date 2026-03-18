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
