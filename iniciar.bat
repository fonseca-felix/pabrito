@echo off
title KUARAHY 2D Arcade - Launcher
cd /d "%~dp0"

echo ========================================================
echo        INICIANDO KUARAHY - 2D ARCADE FIGHTING GAME
echo ========================================================
echo.
echo Abrindo o jogo no navegador...
start http://localhost:3000/

echo Iniciando servidor de desenvolvimento...
call npm.cmd run dev

pause
