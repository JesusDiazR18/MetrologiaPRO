@echo off
TITLE QMS - Sistema de Gestion de Metrologia
SETLOCAL Enabledelayedexpansion

:: Colores y Estetica
echo.
echo  ==========================================================
echo     BIENVENIDO AL SISTEMA QMS - EQUIPOS E INSTRUMENTOS
echo  ==========================================================
echo.

:: 1. Comprobar Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no esta en el PATH.
    pause
    exit /b
)

:: 2. Instalacion Rapida
if not exist "node_modules" (
    echo [1/3] Instalando dependencias necesarias...
    call npm install --no-audit --no-fund
) else (
    echo [1/3] Dependencias listas.
)

:: 3. Prisma y Base de Datos
echo [2/3] Sincronizando configuracion de base de datos...
call npx prisma generate
call npx prisma db push --accept-data-loss

:: 4. Iniciar Servidor
echo [3/3] Iniciando servidor...
echo.
echo  ==========================================================
echo     EL SISTEMA SE ESTA INICIANDO...
echo     Se abrira el navegador en http://localhost:3000
echo  ==========================================================
echo.

:: Abrir navegador
start http://localhost:3000

:: Iniciar Next.js directamente
call npx next dev

pause
