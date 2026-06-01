#!/usr/bin/env bash
# =============================================================================
# deploy.sh — LMS deployment script for Ubuntu VPS
# Tested on: Ubuntu 20.04 / 22.04 / 24.04
#
# Usage:
#   chmod +x deploy.sh && sudo ./deploy.sh           # interactive
#   sudo ./deploy.sh --domain lms.miweb.com          # con SSL automático
#   sudo ./deploy.sh --no-ssl                        # HTTP solo (sin dominio)
#   sudo ./deploy.sh --update                        # actualizar versión
#   sudo ./deploy.sh --seed                          # cargar datos de demo
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
OVERWRITE_ENV=false

for arg in "$@"; do
  case $arg in
    --domain=*) DOMAIN="${arg#*=}"; USE_SSL=true ;;
    --no-ssl)   USE_SSL=false ;;
    --update)   UPDATE_MODE=true ;;
    --seed)     RUN_SEED=true ;;
    --help)
      echo "Uso: sudo ./deploy.sh [opciones]"
      echo "  --domain=tudominio.com   Configura SSL automático con Let's Encrypt"
      echo "  --no-ssl                 Solo HTTP (sin dominio)"
      echo "  --update                 Pull + rebuild sin reconfigurar"
      echo "  --seed                   Carga datos de demo después de desplegar"
      exit 0 ;;
  esac
done

# ── Verificar root ────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Ejecutá como root: sudo ./deploy.sh"

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${BLUE}"
echo "  ██╗     ███╗   ███╗███████╗"
echo "  ██║     ████╗ ████║██╔════╝"
echo "  ██║     ██╔████╔██║███████╗"
echo "  ██║     ██║╚██╔╝██║╚════██║"
echo "  ███████╗██║ ╚═╝ ██║███████║"
echo "  ╚══════╝╚═╝     ╚═╝╚══════╝"
echo -e "${NC}${BOLD}  Learning Management System — Deploy Script${NC}"
echo ""

# ── Preguntas interactivas (solo en instalación fresca) ───────────────────────
if [[ "$UPDATE_MODE" == false && -z "$DOMAIN" && "$USE_SSL" == true ]]; then
  section "Configuración inicial"

  echo "¿Tenés un dominio apuntando a este servidor? (ej: lms.miweb.com)"
  echo "Dejalo vacío para usar solo HTTP (no se necesita dominio)"
  echo ""
  read -rp "  Dominio [vacío = HTTP sin SSL]: " DOMAIN

  if [[ -n "$DOMAIN" ]]; then
    USE_SSL=true
    log "SSL configurado para: ${BOLD}$DOMAIN${NC}"
  else
    USE_SSL=false
    warn "Sin dominio → HTTP en puerto 80 (solo para pruebas o LAN)"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 1 — Dependencias del sistema
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 1 — Dependencias del sistema"

info "Actualizando paquetes..."
apt-get update -qq

# Herramientas base
for pkg in curl git ca-certificates gnupg lsb-release openssl ufw python3; do
  if ! dpkg -l "$pkg" &>/dev/null; then
    info "Instalando $pkg..."
    apt-get install -y -qq "$pkg"
  else
    log "$pkg ✓"
  fi
done

# ── Docker ────────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Instalando Docker CE..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
  log "Docker instalado: $(docker --version)"
else
  log "Docker: $(docker --version) ✓"
fi

# Asegurar que el plugin compose está disponible
if ! docker compose version &>/dev/null; then
  apt-get install -y -qq docker-compose-plugin
fi
log "Docker Compose: $(docker compose version --short) ✓"

# ── Certbot (solo si se usa SSL) ──────────────────────────────────────────────
if [[ "$USE_SSL" == true && -n "$DOMAIN" ]]; then
  if ! command -v certbot &>/dev/null; then
    info "Instalando Certbot..."
    apt-get install -y -qq certbot
  fi
  log "Certbot: $(certbot --version 2>&1 | head -1) ✓"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 2 — Código fuente
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 2 — Código fuente"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Repositorio existente en $INSTALL_DIR — actualizando..."
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

cd "$INSTALL_DIR"

# ══════════════════════════════════════════════════════════════════════════════
# FASE 3 — Variables de entorno
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 3 — Variables de entorno"

ENV_FILE="$INSTALL_DIR/.env"

if [[ -f "$ENV_FILE" && "$UPDATE_MODE" == true ]]; then
  log ".env existente conservado"
elif [[ -f "$ENV_FILE" ]]; then
  warn ".env ya existe."
  read -rp "  ¿Sobreescribir con valores nuevos? (s/N): " OW
  [[ "${OW,,}" == "s" ]] && OVERWRITE_ENV=true || log ".env conservado sin cambios"
else
  OVERWRITE_ENV=true
fi

if [[ "$OVERWRITE_ENV" == true ]]; then
  info "Generando .env con secretos seguros aleatorios..."

  JWT_ACCESS_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  COOKIE_SECRET=$(openssl rand -hex 16)
  MYSQL_ROOT_PW=$(openssl rand -base64 18 | tr -d '/+=\n' | head -c 18)
  MYSQL_APP_PW=$(openssl rand -base64 18 | tr -d '/+=\n' | head -c 18)

  if [[ -n "$DOMAIN" ]]; then
    FRONTEND_URL="https://$DOMAIN"
    NEXT_PUBLIC_API_URL="https://$DOMAIN"
  else
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    FRONTEND_URL="http://$SERVER_IP"
    NEXT_PUBLIC_API_URL="http://$SERVER_IP"
  fi

  cat > "$ENV_FILE" <<ENVEOF
# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL="mysql://lms_user:${MYSQL_APP_PW}@mysql:3306/lms_db"
SHADOW_DATABASE_URL="mysql://root:${MYSQL_ROOT_PW}@mysql:3306/lms_shadow"

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

# ─── MySQL ────────────────────────────────────────────────────────────────────
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PW}"
MYSQL_PASSWORD="${MYSQL_APP_PW}"

# ─── SMTP (opcional — dejá en blanco para deshabilitar emails) ────────────────
# SMTP_HOST="smtp.tuservidor.com"
# SMTP_PORT=587
# SMTP_USER="no-reply@tudominio.com"
# SMTP_PASS=""
# SMTP_FROM="LMS <no-reply@tudominio.com>"
ENVEOF

  chmod 600 "$ENV_FILE"
  log ".env generado"
  echo ""
  echo -e "  ${BOLD}Guardá estas credenciales en un lugar seguro:${NC}"
  echo -e "  MySQL root: ${CYAN}${MYSQL_ROOT_PW}${NC}"
  echo -e "  MySQL app:  ${CYAN}${MYSQL_APP_PW}${NC}"
  echo ""
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 4 — Nginx
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 4 — Configuración de Nginx"

NGINX_DEFAULT="$INSTALL_DIR/nginx/default.conf"

if [[ "$USE_SSL" == false || -z "$DOMAIN" ]]; then
  info "Escribiendo configuración HTTP (sin SSL)..."
  cat > "$NGINX_DEFAULT" <<'NGINXEOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 55m;

    location /api/ {
        proxy_pass         http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    location / {
        proxy_pass         http://web:3000;
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
  sed -i "s/YOUR_DOMAIN\.COM/$DOMAIN/g" "$NGINX_DEFAULT"
  log "Dominio $DOMAIN configurado en nginx"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 5 — Certificado SSL
# ══════════════════════════════════════════════════════════════════════════════
if [[ "$USE_SSL" == true && -n "$DOMAIN" ]]; then
  section "FASE 5 — Certificado SSL (Let's Encrypt)"

  CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  if [[ -f "$CERT_PATH" ]]; then
    log "Certificado ya existe para $DOMAIN"
  else
    info "Obteniendo certificado para $DOMAIN..."
    info "(El puerto 80 debe estar libre)"

    # Detener cualquier nginx local que ocupe el 80
    systemctl stop nginx 2>/dev/null || true
    docker compose -f "$INSTALL_DIR/docker-compose.prod.yml" stop nginx 2>/dev/null || true

    read -rp "  Email para Let's Encrypt (notificaciones de renovación): " LE_EMAIL
    [[ -z "$LE_EMAIL" ]] && LE_EMAIL="admin@${DOMAIN}"

    certbot certonly \
      --standalone \
      --non-interactive \
      --agree-tos \
      --email "$LE_EMAIL" \
      -d "$DOMAIN" || error "No se pudo obtener el certificado SSL. Verificá que $DOMAIN apunte a este servidor."

    log "Certificado SSL obtenido"

    # Renovación automática
    if ! crontab -l 2>/dev/null | grep -q certbot; then
      (crontab -l 2>/dev/null; \
       echo "0 3 * * * certbot renew --quiet && docker compose -f $INSTALL_DIR/docker-compose.prod.yml restart nginx") \
       | crontab -
      log "Renovación automática configurada (todos los días a las 3 AM)"
    fi
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 6 — Firewall
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 6 — Firewall"

if command -v ufw &>/dev/null; then
  ufw allow 22/tcp  comment "SSH"   2>/dev/null || true
  ufw allow 80/tcp  comment "HTTP"  2>/dev/null || true
  ufw allow 443/tcp comment "HTTPS" 2>/dev/null || true
  echo "y" | ufw enable 2>/dev/null || true
  log "UFW: SSH(22), HTTP(80), HTTPS(443) abiertos"
else
  warn "UFW no disponible — asegurate de abrir los puertos 22, 80 y 443 manualmente"
fi

# ══════════════════════════════════════════════════════════════════════════════
# FASE 7 — Build y arranque
# ══════════════════════════════════════════════════════════════════════════════
section "FASE 7 — Build y arranque de contenedores"

cd "$INSTALL_DIR"

# Si no hay SSL, crear versión del compose sin el volumen letsencrypt
if [[ "$USE_SSL" == false || -z "$DOMAIN" ]]; then
  info "Preparando compose sin SSL..."
  # Reemplazar el puerto 443 y remover referencias a letsencrypt
  sed '/443:443/d; /letsencrypt/d' docker-compose.prod.yml > /tmp/docker-compose-http.yml
  COMPOSE_CMD="docker compose -f /tmp/docker-compose-http.yml"
else
  COMPOSE_CMD="docker compose -f $INSTALL_DIR/docker-compose.prod.yml"
fi

info "Construyendo imágenes (primera vez puede tardar 5-15 minutos)..."
$COMPOSE_CMD build

info "Iniciando todos los servicios..."
$COMPOSE_CMD up -d

# Esperar MySQL
info "Esperando MySQL..."
for i in $(seq 1 40); do
  if $COMPOSE_CMD exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo ""; log "MySQL disponible"; break
  fi
  [[ $i -eq 40 ]] && error "MySQL no arrancó. Logs:\n$($COMPOSE_CMD logs mysql --tail=30)"
  echo -n "."; sleep 3
done

# Esperar API
info "Esperando API..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/health &>/dev/null; then
    echo ""; log "API disponible en :3001"; break
  fi
  [[ $i -eq 30 ]] && { warn "API tardando. Verificá los logs:"; $COMPOSE_CMD logs api --tail=20; break; }
  echo -n "."; sleep 4
done

# ══════════════════════════════════════════════════════════════════════════════
# FASE 8 — Seed de datos (opcional)
# ══════════════════════════════════════════════════════════════════════════════
if [[ "$RUN_SEED" == true ]] || { [[ "$UPDATE_MODE" == false ]]; read -rp "
¿Cargar datos de demostración? (cursos, usuarios, progreso) (s/N): " LOAD_SEED; [[ "${LOAD_SEED,,}" == "s" ]]; }; then
  section "FASE 8 — Seed de datos"

  info "Ejecutando seed base (roles y permisos)..."
  $COMPOSE_CMD exec -T api sh -c \
    "cd /app/packages/shared && npx ts-node --project tsconfig.json prisma/seed.ts" \
    && log "Seed base completado"

  info "Cargando Carrera de Ética Empresarial (4 cursos)..."
  $COMPOSE_CMD exec -T api sh -c \
    "cd /app/packages/shared && npx ts-node --project tsconfig.json prisma/seed-carrera-etica.ts" \
    && log "Cursos cargados"

  info "Inscribiendo estudiantes con progreso variado..."
  $COMPOSE_CMD exec -T api sh -c \
    "cd /app/packages/shared && npx ts-node --project tsconfig.json prisma/seed-enroll-carrera.ts" \
    && log "Estudiantes inscritos"
fi

# ══════════════════════════════════════════════════════════════════════════════
# RESUMEN FINAL
# ══════════════════════════════════════════════════════════════════════════════
section "DESPLIEGUE COMPLETADO"

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

if [[ -n "$DOMAIN" && "$USE_SSL" == true ]]; then
  BASE_URL="https://$DOMAIN"
else
  BASE_URL="http://$SERVER_IP"
fi

echo -e "${GREEN}${BOLD}  ¡LMS desplegado exitosamente!${NC}"
echo ""
echo -e "  🌐  LMS:      ${BOLD}${CYAN}${BASE_URL}${NC}"
echo -e "  📡  API:      ${BOLD}${CYAN}${BASE_URL}/api/v1${NC}"
echo -e "  📖  Swagger:  ${BOLD}${CYAN}${BASE_URL}/api/docs${NC}"
echo ""
echo -e "${BOLD}  Comandos útiles:${NC}"
echo -e "  ${CYAN}${COMPOSE_CMD} ps${NC}              — estado de contenedores"
echo -e "  ${CYAN}${COMPOSE_CMD} logs -f api${NC}     — logs del API"
echo -e "  ${CYAN}${COMPOSE_CMD} logs -f web${NC}     — logs del frontend"
echo -e "  ${CYAN}${COMPOSE_CMD} restart${NC}         — reiniciar todo"
echo -e "  ${CYAN}${COMPOSE_CMD} down${NC}            — detener todo"
echo -e "  ${CYAN}sudo bash $INSTALL_DIR/deploy.sh --update${NC} — actualizar"
echo ""
echo -e "  ${BOLD}Archivos:${NC}"
echo -e "  .env:   ${CYAN}$ENV_FILE${NC}"
echo -e "  Nginx:  ${CYAN}$INSTALL_DIR/nginx/default.conf${NC}"
echo ""
