#!/usr/bin/env bash
set -euo pipefail

# LMS VPS Deployment Script
# Usage: ./deploy.sh [--skip-build]

SKIP_BUILD=${1:-""}
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Pulling latest changes..."
git pull --ff-only origin main

[[ -f .env ]] || { echo "ERROR: .env not found. Copy env.example and fill in secrets."; exit 1; }
source .env

if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
  echo "==> Building images..."
  docker compose -f "$COMPOSE_FILE" build --no-cache
fi

echo "==> Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm api sh -c "pnpm exec prisma migrate deploy" || {
    echo "ERROR: Migration failed. Aborting deployment."
    exit 1
  }

echo "==> Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deployment complete!"
docker compose -f "$COMPOSE_FILE" ps
