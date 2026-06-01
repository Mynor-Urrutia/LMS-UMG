param([switch]$Studio)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "  LMS -- Entorno de desarrollo" -ForegroundColor Cyan
Write-Host "  =============================" -ForegroundColor Cyan
Write-Host ""

# --- Verificaciones previas ---------------------------------------------------

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "  ERROR: pnpm no encontrado. Instala con: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $root ".env"))) {
    $example = Join-Path $root "env.example"
    if (Test-Path $example) {
        Write-Host "  AVISO: .env no encontrado. Copiando desde env.example..." -ForegroundColor Yellow
        Copy-Item $example (Join-Path $root ".env")
        Write-Host "  Edita .env con tus valores y vuelve a ejecutar el script." -ForegroundColor Yellow
        Start-Process notepad (Join-Path $root ".env")
        exit 0
    } else {
        Write-Host "  ERROR: Falta el archivo .env en la raiz del proyecto." -ForegroundColor Red
        exit 1
    }
}

# Crear apps/web/.env.local si no existe
$webEnv = Join-Path $root "apps\web\.env.local"
if (-not (Test-Path $webEnv)) {
    Write-Host "  Creando apps/web/.env.local..." -ForegroundColor DarkGray
    Set-Content -Path $webEnv -Value "NEXT_PUBLIC_API_URL=http://localhost:3001" -Encoding UTF8
}

# --- Migraciones de base de datos --------------------------------------------

Write-Host "  Ejecutando migraciones de base de datos..." -ForegroundColor DarkCyan
try {
    & pnpm db:migrate 2>&1 | Out-Null
    Write-Host "  Migraciones aplicadas." -ForegroundColor DarkGreen
} catch {
    Write-Host "  AVISO: No se pudieron aplicar las migraciones (¿MySQL corriendo?)." -ForegroundColor Yellow
    Write-Host "         Continua de todas formas..." -ForegroundColor DarkGray
}

# Detectar el ejecutable de PowerShell que corre este script (powershell.exe o pwsh.exe)
$shellExe = (Get-Process -Id $PID).MainModule.FileName

# --- Levantar servicios -------------------------------------------------------

Write-Host "  Iniciando LMS API..." -ForegroundColor Green
$apiCmd = "Set-Location '$root'; Write-Host 'LMS API (3001)' -ForegroundColor Green; pnpm dev:api"
Start-Process -FilePath $shellExe `
              -ArgumentList "-NoExit", "-Command", $apiCmd `
              -WorkingDirectory $root `
              -WindowStyle Normal
Start-Sleep -Milliseconds 700

Write-Host "  Iniciando LMS Web..." -ForegroundColor Blue
$webCmd = "Set-Location '$root'; Write-Host 'LMS Web (3000)' -ForegroundColor Blue; pnpm dev:web"
Start-Process -FilePath $shellExe `
              -ArgumentList "-NoExit", "-Command", $webCmd `
              -WorkingDirectory $root `
              -WindowStyle Normal
Start-Sleep -Milliseconds 700

if ($Studio) {
    Write-Host "  Iniciando Prisma Studio..." -ForegroundColor Magenta
    $studioCmd = "Set-Location '$root'; pnpm db:studio"
    Start-Process -FilePath $shellExe `
                  -ArgumentList "-NoExit", "-Command", $studioCmd `
                  -WorkingDirectory $root `
                  -WindowStyle Normal
}

# --- Resumen -----------------------------------------------------------------

Write-Host ""
Write-Host "  Servicios iniciados:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Web       ->  http://localhost:3000" -ForegroundColor Blue
Write-Host "    API       ->  http://localhost:3001" -ForegroundColor Green
Write-Host "    Swagger   ->  http://localhost:3001/api/docs" -ForegroundColor DarkGreen
if ($Studio) {
    Write-Host "    Studio    ->  http://localhost:5555" -ForegroundColor Magenta
} else {
    Write-Host "    Studio    ->  .\dev.ps1 -Studio" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "  Para detener todo, cierra las terminales abiertas." -ForegroundColor DarkGray
Write-Host ""

Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"
