.PHONY: dev prod build install db-migrate db-generate db-seed db-studio logs down clean

# ── Development ───────────────────────────────────────────────────────────────
install:
	pnpm install

dev:
	docker-compose up

dev-bg:
	docker-compose up -d

# ── Production ────────────────────────────────────────────────────────────────
prod:
	docker-compose -f docker-compose.prod.yml up -d

build:
	docker-compose -f docker-compose.prod.yml build

# ── Database ──────────────────────────────────────────────────────────────────
db-migrate:
	pnpm db:migrate

db-migrate-prod:
	docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

db-generate:
	pnpm db:generate

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

# ── Utilities ─────────────────────────────────────────────────────────────────
logs:
	docker-compose logs -f

down:
	docker-compose down

down-prod:
	docker-compose -f docker-compose.prod.yml down

clean:
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
