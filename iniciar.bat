@echo off
chcp 65001 >nul
title KUARAHY 2D Arcade - Launcher
cd /d "%~dp0"

echo ========================================================
echo        INICIANDO KUARAHY - 2D ARCADE FIGHTING GAME
echo ========================================================
echo.

if not exist "node_modules\" (
    echo [1/2] Dependencias nao encontradas. Instalando pacotes ^(npm install^)...
    call npm.cmd install --legacy-peer-deps
    if errorlevel 1 (
        echo.
        echo [ERRO] Falha ao instalar as dependencias!
        pause
        exit /b 1
    )
    echo.
)

echo Iniciando servidor de desenvolvimento e abrindo navegador...
call npm.cmd run dev -- --open

pause

