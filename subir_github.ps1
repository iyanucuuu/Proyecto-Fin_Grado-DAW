# ─────────────────────────────────────────────────────────────────────────────
#  Karts4Spain — Script de subida a GitHub
#  Ejecuta este script UNA SOLA VEZ desde PowerShell
#  Repositorio destino: https://github.com/iyanucuuu/Proyecto-Fin_Grado-DAW
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

# ── Configuración ─────────────────────────────────────────────────────────────
$GITHUB_USER  = "iyanucuuu"
$REPO_NAME    = "Proyecto-Fin_Grado-DAW"
$GITHUB_TOKEN = "TU_GITHUB_TOKEN"   # <-- ya no necesario, sustituido por autenticación local

$REMOTE_URL   = "https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n🏎️  Karts4Spain — Subida a GitHub" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Set-Location $PROJECT_ROOT

# ── 1. Inicializar git ─────────────────────────────────────────────────────────
if (-not (Test-Path ".git")) {
    Write-Host "`n[1/5] Inicializando repositorio git..." -ForegroundColor Yellow
    git init -b main
    git config user.email "iyangirones@gmail.com"
    git config user.name "Derrick rose"
} else {
    Write-Host "`n[1/5] Repositorio git ya existe, continuando..." -ForegroundColor Green
}

# ── 2. Añadir archivos (respeta .gitignore automáticamente) ───────────────────
Write-Host "`n[2/5] Añadiendo archivos al staging..." -ForegroundColor Yellow
git add -A

# ── 3. Commit inicial ─────────────────────────────────────────────────────────
Write-Host "`n[3/5] Haciendo commit inicial..." -ForegroundColor Yellow
$commitMsg = @"
feat: inicial — Karts4Spain TFG

Plataforma social para la comunidad del karting en España.

Frontend: Angular 21 + Mapbox GL + Bootstrap 5 + Supabase
Backend:  Spring Boot 3.2 + JPA/Hibernate + PostgreSQL
Deploy:   Docker + Docker Compose + Nginx
"@
git commit -m $commitMsg

# ── 4. Añadir remote de GitHub ─────────────────────────────────────────────────
Write-Host "`n[4/5] Configurando remote de GitHub..." -ForegroundColor Yellow
$remoteExists = git remote | Select-String "origin"
if ($remoteExists) {
    git remote set-url origin $REMOTE_URL
} else {
    git remote add origin $REMOTE_URL
}

# ── 5. Push ───────────────────────────────────────────────────────────────────
Write-Host "`n[5/5] Subiendo código a GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n✅  ¡Listo! Tu proyecto está en:" -ForegroundColor Green
Write-Host "    https://github.com/${GITHUB_USER}/${REPO_NAME}" -ForegroundColor Cyan
Write-Host ""
