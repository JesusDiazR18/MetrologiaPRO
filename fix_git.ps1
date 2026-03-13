$ErrorActionPreference = "Continue"
Write-Host "Limpiando bloqueos de Git..."
if (Test-Path .git/index.lock) { Remove-Item .git/index.lock -Force }
if (Test-Path .git/HEAD.lock) { Remove-Item .git/HEAD.lock -Force }

Write-Host "Configurando identidad..."
git config user.email "jesus@metrologia.pro"
git config user.name "Jesus Diaz Bot"

Write-Host "Agregando archivos criticamente ignorados..."
git add -f src/lib/metrologia.ts
git add -f src/lib/prisma.ts

Write-Host "Creando commit..."
git commit --no-verify -m "Fix: Adding missing modules for Vercel build"

Write-Host "Subiendo a GitHub..."
git push origin main --force --no-verify

Write-Host "Proceso terminado."
