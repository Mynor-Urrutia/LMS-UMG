#!/usr/bin/env bash
# =============================================================================
# deploy-azure-direct.sh — LMS despliegue DIRECTO en Azure VM (sin Docker)
# Probado en: Ubuntu 22.04 / 24.04
#
# Uso:
#   chmod +x deploy-azure-direct.sh && sudo ./deploy-azure-direct.sh
#   sudo ./deploy-azure-direct.sh --domain lms.miweb.com   # con SSL
#   sudo ./deploy-azure-direct.sh --no-ssl                 # HTTP solo
#   sudo ./deploy-azure-direct.sh --update                 # actualizar app
#   sudo ./deploy-azure-direct.sh --seed                   # cargar demo
# =============================================================================

set -euo pipefail

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $*"; }
info()    { echo -e "${BLUE}[i]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }
section() {
  echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  $*${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}\n"
}

# ── Parámetros ────────────────────────────────────────────────────────────────
DOMAIN=""
USE_SSL=true
UPDATE_MODE=false
RUN_SEED=false
REPO_URL="https://github.com/Mynor-Urrutia/LMS-UMG.git"
INSTALL_DIR="/opt/lms"
APP_USER="lmsapp"
NODE_VERSION="20"
OVERWRITE_ENV=false

for arg in "$@"; do
  case $arg in
    --domain=*) DOMAIN="${arg#*=}"; USE_SSL=true ;;
    --no-ssl)   USE_SSL=false ;;
    --update)   UPDATE_MODE=true ;;
    --seed)     RUN_SEED=true ;;
    --help)
      echo "Uso: sudo ./deploy-azure-direct.sh [opciones]"
      echo "  --domain=tudominio.com   Configura SSL con Let's Encrypt"
      echo "  --no-ssl                 Solo HTTP"
      echo "  --update                 Actualizar código sin reconfigurar"
      echo "  --seed                   Cargar datos de demostración"
      exit 0 ;;
  esac
done

# ── Verificar root ────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Ejecutá como root: sudo ./deploy-azure-direct.sh"

# ── Banner ────────────────────────────────────────────────────────────────────
clear 2>/dev/null || true
echo -e "${BOLD}${BLUE}"
echo "  ██╗     ███╗   ███╗███████╗"
echo "  ██║     ████╗ ████║██╔════╝"
echo "  ██║     ██╔████╔██║███████╗"
echo "  ██║     ██║╚██╔╝██║╚════██║"
echo "  ███████╗██║ ╚═╝ ██║███████║"
echo "  ╚══════╝╚═╝     ╚═╝╚══════╝"
echo -e "${NC}${BOLD}  LMS — Despliegue Directo en Azure VM${NC}"
echo ""

# ── Preguntas interactivas ────────────────────────────────────────────────────
if [[ "$UPDATE_MODE" == false && -z "$DOMAIN" && "$USE_SSL" == true ]]; then
  section "Configuración inicial"

  echo "¿Tenés un dominio apuntando a este servidor? (ej: lms.miweb.com)"
  echo "Dejalo vacío para usar la IP pública (HTTP sin SSL)"
  echo ""
  read -rp "  Dominio [vacío = HTTP con IP pública]: " DOMAIN

  if [[ -n "$DOMAIN" ]]; then
    USE_SSL=true
    log "SSL configurado para: ${BOLD}$DOMAIN${NC}"
  else
    USE_SSL=false
    warn "Sin dominio → HTTP (recomendado solo para pruebas)"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 1 — Usuario del sistema
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 1 — Usuario de aplicación"

if ! id "$APP_USER" &>/dev/null; then
  useradd --system --create-home --shell /bin/bash "$APP_USER"
  log "Usuario '$APP_USER' creado"
else
  log "Usuario '$APP_USER' ya existe"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 2 — Dependencias del sistema
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 2 — Dependencias del sistema"

info "Actualizando paquetes..."
apt-get update -qq

for pkg in curl git ca-certificates gnupg lsb-release openssl ufw python3 build-essential; do
  if ! dpkg -l "$pkg" &>/dev/null; then
    info "Instalando $pkg..."
    apt-get install -y -qq "$pkg"
  else
    log "$pkg ✓"
  fi
done

# ── Node.js ───────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt "$NODE_VERSION" ]]; then
  info "Instalando Node.js $NODE_VERSION LTS..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y -qq nodejs
  log "Node.js: $(node --version)"
else
  log "Node.js: $(node --version) ✓"
fi

# ── pnpm (v9 — compatible con Node.js 20; pnpm@10+ requiere Node.js 22) ───────
NPM_BIN=$(command -v npm || echo /usr/bin/npm)
PNPM_VERSION="9"
if ! command -v pnpm &>/dev/null || ! pnpm --version &>/dev/null; then
  info "Instalando pnpm@$PNPM_VERSION..."
  # Eliminar versión rota si existe
  $NPM_BIN uninstall -g pnpm 2>/dev/null || true
  $NPM_BIN install -g "pnpm@$PNPM_VERSION"
  log "pnpm: $(pnpm --version)"
else
  log "pnpm: $(pnpm --version) ✓"
fi

# ── PM2 ───────────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "Instalando PM2..."
  $NPM_BIN install -g pm2
  log "PM2: $(pm2 --version)"
else
  log "PM2: $(pm2 --version) ✓"
fi

# ── Nginx ─────────────────────────────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  info "Instalando Nginx..."
  apt-get install -y -qq nginx
  systemctl enable nginx
  log "Nginx: $(nginx -v 2>&1)"
else
  log "Nginx: $(nginx -v 2>&1) ✓"
fi

# ── MySQL 8.0 ─────────────────────────────────────────────────────────────────
if ! command -v mysql &>/dev/null; then
  info "Instalando MySQL 8.0..."
  apt-get install -y -qq mysql-server
  systemctl enable mysql
  systemctl start mysql
  log "MySQL: $(mysql --version)"
else
  log "MySQL: $(mysql --version) ✓"
  systemctl start mysql 2>/dev/null || true
fi

# ── Certbot (solo si SSL) ─────────────────────────────────────────────────────
if [[ "$USE_SSL" == true && -n "$DOMAIN" ]]; then
  if ! command -v certbot &>/dev/null; then
    info "Instalando Certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx
  fi
  log "Certbot: $(certbot --version 2>&1 | head -1) ✓"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 3 — Base de datos
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 3 — Configuración de MySQL"

ENV_FILE="$INSTALL_DIR/.env"

# Determinar si necesitamos generar credenciales nuevas
MYSQL_ROOT_PW=""
MYSQL_APP_PW=""

if [[ -f "$ENV_FILE" && "$UPDATE_MODE" == true ]]; then
  log ".env existente conservado — usando credenciales actuales"
  source <(grep -E '^MYSQL_(ROOT_PASSWORD|PASSWORD)=' "$ENV_FILE" | sed 's/^/export /')
  MYSQL_ROOT_PW="${MYSQL_ROOT_PASSWORD:-}"
  MYSQL_APP_PW="${MYSQL_PASSWORD:-}"
fi

if [[ -z "$MYSQL_ROOT_PW" ]]; then
  MYSQL_ROOT_PW=$(openssl rand -base64 18 | tr -d '/+=\n' | head -c 18)
  MYSQL_APP_PW=$(openssl rand -base64 18 | tr -d '/+=\n' | head -c 18)
fi

# Crear base de datos y usuario
info "Configurando base de datos..."

# Detectar método de auth de root: primero sin password (auth_socket), luego con password
MYSQL_ROOT_CONNECT=""
if mysql -u root -e "SELECT 1;" 2>/dev/null; then
  MYSQL_ROOT_CONNECT="mysql -u root"
  info "Conectando como root (auth_socket)"
elif [[ -n "$MYSQL_ROOT_PW" ]] && mysql -u root -p"${MYSQL_ROOT_PW}" -e "SELECT 1;" 2>/dev/null; then
  MYSQL_ROOT_CONNECT="mysql -u root -p\"${MYSQL_ROOT_PW}\""
  info "Conectando como root con contraseña del .env"
else
  warn "No se puede conectar a MySQL como root — saltando configuración automática"
fi

if [[ -n "$MYSQL_ROOT_CONNECT" ]]; then
  eval "$MYSQL_ROOT_CONNECT" <<SQLEOF 2>/dev/null
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PW}';
CREATE DATABASE IF NOT EXISTS lms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lms_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS 'lms_user'@'localhost';
CREATE USER 'lms_user'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_APP_PW}';
GRANT ALL PRIVILEGES ON lms_db.* TO 'lms_user'@'localhost';
GRANT ALL PRIVILEGES ON lms_shadow.* TO 'lms_user'@'localhost';
FLUSH PRIVILEGES;
SQLEOF
  log "Base de datos 'lms_db' y usuario 'lms_user' configurados"
else
  warn "MySQL no configurado automáticamente — asegurate de que lms_user tenga acceso a lms_db"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 4 — Código fuente
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 4 — Código fuente"

git config --global --add safe.directory "$INSTALL_DIR" 2>/dev/null || true

if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Repositorio existente — actualizando..."
  cd "$INSTALL_DIR"
  git fetch origin
  git reset --hard origin/main
  log "Actualizado al commit: $(git rev-parse --short HEAD)"
else
  info "Clonando repositorio..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  log "Clonado: $(git rev-parse --short HEAD)"
fi

chown -R "$APP_USER":"$APP_USER" "$INSTALL_DIR"
cd "$INSTALL_DIR"

# ══════════════════════════════════════════════════════════════════════════════
# FASE 5 — Variables de entorno
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 5 — Variables de entorno"

if [[ -f "$ENV_FILE" && "$UPDATE_MODE" == true ]]; then
  log ".env existente conservado"
elif [[ -f "$ENV_FILE" ]]; then
  warn ".env ya existe."
  read -rp "  ¿Sobreescribir? (s/N): " OW
  [[ "${OW,,}" == "s" ]] && OVERWRITE_ENV=true || log ".env conservado"
else
  OVERWRITE_ENV=true
fi

if [[ "$OVERWRITE_ENV" == true ]]; then
  info "Generando .env..."

  JWT_ACCESS_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  COOKIE_SECRET=$(openssl rand -hex 16)

  if [[ -n "$DOMAIN" ]]; then
    FRONTEND_URL="https://$DOMAIN"
    NEXT_PUBLIC_API_URL="https://$DOMAIN"
  else
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    FRONTEND_URL="http://$SERVER_IP"
    NEXT_PUBLIC_API_URL="http://$SERVER_IP"
  fi

  cat > "$ENV_FILE" <<ENVEOF
# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL="mysql://lms_user:${MYSQL_APP_PW}@localhost:3306/lms_db"
SHADOW_DATABASE_URL="mysql://lms_user:${MYSQL_APP_PW}@localhost:3306/lms_shadow"

# ─── Auth ─────────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
COOKIE_SECRET="${COOKIE_SECRET}"

# ─── App ──────────────────────────────────────────────────────────────────────
NODE_ENV="production"
PORT=3001
FRONTEND_URL="${FRONTEND_URL}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}"

# ─── Rate limiting ────────────────────────────────────────────────────────────
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=200

# ─── MySQL (credenciales locales) ─────────────────────────────────────────────
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PW}"
MYSQL_PASSWORD="${MYSQL_APP_PW}"

# ─── SMTP (opcional) ──────────────────────────────────────────────────────────
# SMTP_HOST="smtp.tuservidor.com"
# SMTP_PORT=587
# SMTP_USER="no-reply@tudominio.com"
# SMTP_PASS=""
# SMTP_FROM="LMS <no-reply@tudominio.com>"
ENVEOF

  chmod 600 "$ENV_FILE"
  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  log ".env generado"
  echo ""
  echo -e "  ${BOLD}Guardá estas credenciales:${NC}"
  echo -e "  MySQL root: ${CYAN}${MYSQL_ROOT_PW}${NC}"
  echo -e "  MySQL app:  ${CYAN}${MYSQL_APP_PW}${NC}"
  echo ""
fi

# Cargar variables para usar en este script
set -a
source "$ENV_FILE"
set +a

# ══════════════════════════════════════════════════════════════════════════════
# FASE 6 — Instalar dependencias y compilar
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 6 — Instalar dependencias y compilar"

cd "$INSTALL_DIR"

info "Instalando dependencias del monorepo (puede tardar 3-5 min)..."
sudo -u "$APP_USER" pnpm install

info "Generando cliente Prisma..."
sudo -u "$APP_USER" bash -c "
  cd $INSTALL_DIR/packages/shared
  DATABASE_URL=\"$DATABASE_URL\" \
  SHADOW_DATABASE_URL=\"$SHADOW_DATABASE_URL\" \
  npx prisma generate
"
log "Cliente Prisma generado"

info "Compilando API (NestJS)..."
sudo -u "$APP_USER" bash -c "
  cd $INSTALL_DIR/apps/api
  pnpm build
"
log "API compilada en apps/api/dist/"

info "Compilando frontend (Next.js)..."
sudo -u "$APP_USER" bash -c "
  cd $INSTALL_DIR/apps/web
  NEXT_PUBLIC_API_URL=\"$NEXT_PUBLIC_API_URL\" \
  NODE_ENV=production \
  pnpm build
"
log "Frontend compilado en apps/web/.next/"

# ══════════════════════════════════════════════════════════════════════════════
# FASE 7 — Migraciones de base de datos
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 7 — Migraciones de base de datos"

info "Ejecutando migraciones Prisma..."
sudo -u "$APP_USER" bash -c "
  cd $INSTALL_DIR/packages/shared
  DATABASE_URL=\"$DATABASE_URL\" \
  SHADOW_DATABASE_URL=\"$SHADOW_DATABASE_URL\" \
  npx prisma migrate deploy
"
log "Migraciones aplicadas"

# ══════════════════════════════════════════════════════════════════════════════
# FASE 8 — Configurar servicios systemd
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 8 — Configurar servicios systemd"

# Directorio de logs
mkdir -p /var/log/lms
chown "$APP_USER":"$APP_USER" /var/log/lms

info "Creando servicio systemd para la API..."
cat > /etc/systemd/system/lms-api.service <<SVCEOF
[Unit]
Description=LMS API (NestJS)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$INSTALL_DIR/apps/api
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/lms/api-out.log
StandardError=append:/var/log/lms/api-err.log

[Install]
WantedBy=multi-user.target
SVCEOF

info "Creando servicio systemd para el frontend..."
cat > /etc/systemd/system/lms-web.service <<SVCEOF
[Unit]
Description=LMS Web (Next.js)
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$INSTALL_DIR/apps/web
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/pnpm run start
Restart=always
RestartSec=5
StandardOutput=append:/var/log/lms/web-out.log
StandardError=append:/var/log/lms/web-err.log

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable lms-api lms-web

info "Reiniciando servicios..."
systemctl restart lms-api lms-web 2>/dev/null || systemctl start lms-api lms-web

log "Servicios systemd configurados — lms-api en :3001, lms-web en :3000"

# ══════════════════════════════════════════════════════════════════════════════
# FASE 9 — Nginx
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 9 — Configuración de Nginx"

NGINX_CONF="/etc/nginx/sites-available/lms"

if [[ "$USE_SSL" == false || -z "$DOMAIN" ]]; then
  info "Configurando Nginx HTTP..."
  cat > "$NGINX_CONF" <<'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 55m;

    # API
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    # Frontend Next.js
    location /_next/static/ {
        alias /opt/lms/apps/web/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location ~ /\. { deny all; }
}
NGINXEOF
  log "Nginx configurado para HTTP"

else
  info "Configurando Nginx para dominio: $DOMAIN"
  cat > "$NGINX_CONF" <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    client_max_body_size 55m;

    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_read_timeout 90s;
    }

    location /_next/static/ {
        alias /opt/lms/apps/web/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
    }

    location ~ /\. { deny all; }
}
NGINXEOF
  log "Nginx configurado para HTTPS"
fi

# Activar el sitio
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/lms
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t && systemctl reload nginx
log "Nginx recargado"

# ══════════════════════════════════════════════════════════════════════════════
# FASE 10 — SSL (Let's Encrypt)
# ══════════════════════════════════════════════════════════════════════════════
if [[ "$USE_SSL" == true && -n "$DOMAIN" ]]; then
  section "FASE 10 — Certificado SSL (Let's Encrypt)"

  CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  if [[ -f "$CERT_PATH" ]]; then
    log "Certificado ya existe para $DOMAIN"
  else
    read -rp "  Email para Let's Encrypt: " LE_EMAIL
    [[ -z "$LE_EMAIL" ]] && LE_EMAIL="admin@${DOMAIN}"

    certbot --nginx \
      --non-interactive \
      --agree-tos \
      --email "$LE_EMAIL" \
      -d "$DOMAIN" \
      --redirect || error "No se pudo obtener SSL. Verificá que $DOMAIN apunte a este servidor."

    log "Certificado SSL obtenido y Nginx actualizado"

    # Renovación automática (certbot instala un timer en systemd automáticamente)
    systemctl enable certbot.timer 2>/dev/null || \
      (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --nginx") | crontab -
    log "Renovación automática SSL configurada"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 11 — Firewall
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 11 — Firewall"

if command -v ufw &>/dev/null; then
  ufw allow 22/tcp   comment "SSH"    2>/dev/null || true
  ufw allow 80/tcp   comment "HTTP"   2>/dev/null || true
  ufw allow 443/tcp  comment "HTTPS"  2>/dev/null || true
  ufw deny  3000/tcp comment "Next.js interno" 2>/dev/null || true
  ufw deny  3001/tcp comment "API interna"     2>/dev/null || true
  echo "y" | ufw enable 2>/dev/null || true
  log "UFW: SSH(22), HTTP(80), HTTPS(443) abiertos; 3000/3001 bloqueados externamente"
else
  warn "UFW no disponible — abrí los puertos 22, 80 y 443 en el NSG de Azure"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 12 — Seed de datos (opcional)
# ══════════════════════════════════════════════════════════════════════════════
run_seed=false
if [[ "$RUN_SEED" == true ]]; then
  run_seed=true
elif [[ "$UPDATE_MODE" == false ]]; then
  echo ""
  read -rp "¿Cargar datos de demostración? (cursos, usuarios, progreso) (s/N): " LOAD_SEED
  [[ "${LOAD_SEED,,}" == "s" ]] && run_seed=true
fi

if [[ "$run_seed" == true ]]; then
  section "FASE 12 — Seed de datos"

  SEED_ENV="DATABASE_URL=\"$DATABASE_URL\" SHADOW_DATABASE_URL=\"$SHADOW_DATABASE_URL\""

  info "Ejecutando seed base (roles y permisos)..."
  sudo -u "$APP_USER" bash -c "
    cd $INSTALL_DIR/packages/shared
    $SEED_ENV npx ts-node --project tsconfig.json prisma/seed.ts
  " && log "Seed base completado"

  info "Cargando Carrera de Ética Empresarial..."
  sudo -u "$APP_USER" bash -c "
    cd $INSTALL_DIR/packages/shared
    $SEED_ENV npx ts-node --project tsconfig.json prisma/seed-carrera-etica.ts
  " && log "Cursos cargados"

  info "Inscribiendo estudiantes con progreso..."
  sudo -u "$APP_USER" bash -c "
    cd $INSTALL_DIR/packages/shared
    $SEED_ENV npx ts-node --project tsconfig.json prisma/seed-enroll-carrera.ts
  " && log "Estudiantes inscritos"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 13 — Verificar servicios
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 13 — Verificación"

info "Esperando que la API esté lista..."
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:3001/health &>/dev/null; then
    log "API responde en :3001"
    break
  fi
  [[ $i -eq 20 ]] && warn "API aún no responde. Revisá: sudo journalctl -u lms-api -n 50"
  sleep 3; echo -n "."
done

info "Esperando frontend..."
for i in $(seq 1 15); do
  if curl -sf http://127.0.0.1:3000 &>/dev/null; then
    log "Frontend responde en :3000"
    break
  fi
  [[ $i -eq 15 ]] && warn "Frontend aún no responde. Revisá: sudo journalctl -u lms-web -n 50"
  sleep 3; echo -n "."
done

# ══════════════════════════════════════════════════════════════════════════════
# RESUMEN FINAL
# ══════════════════════════════════════════════════════════════════════════════
section "DESPLIEGUE COMPLETADO"

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
BASE_URL=$( [[ -n "$DOMAIN" && "$USE_SSL" == true ]] && echo "https://$DOMAIN" || echo "http://$SERVER_IP" )

echo -e "${GREEN}${BOLD}  ¡LMS desplegado exitosamente (sin Docker)!${NC}"
echo ""
echo -e "  🌐  LMS:      ${BOLD}${CYAN}${BASE_URL}${NC}"
echo -e "  📡  API:      ${BOLD}${CYAN}${BASE_URL}/api/v1${NC}"
echo -e "  📖  Swagger:  ${BOLD}${CYAN}${BASE_URL}/api/docs${NC}"
echo ""
echo -e "${BOLD}  Gestión de servicios (systemd):${NC}"
echo -e "  ${CYAN}sudo systemctl status lms-api lms-web${NC}     — estado"
echo -e "  ${CYAN}sudo journalctl -u lms-api -f${NC}             — logs API"
echo -e "  ${CYAN}sudo journalctl -u lms-web -f${NC}             — logs frontend"
echo -e "  ${CYAN}sudo systemctl restart lms-api lms-web${NC}    — reiniciar todo"
echo ""
echo -e "${BOLD}  Actualizar aplicación:${NC}"
echo -e "  ${CYAN}sudo bash $INSTALL_DIR/deploy-azure-direct.sh --update${NC}"
echo ""
echo -e "${BOLD}  Archivos importantes:${NC}"
echo -e "  .env:    ${CYAN}$ENV_FILE${NC}"
echo -e "  Nginx:   ${CYAN}$NGINX_CONF${NC}"
echo -e "  Logs:    ${CYAN}/var/log/lms/${NC}"
echo ""
echo -e "${BOLD}  MySQL:${NC}"
echo -e "  Conectar:  ${CYAN}mysql -u lms_user -p'${MYSQL_APP_PW}' lms_db${NC}"
echo ""
