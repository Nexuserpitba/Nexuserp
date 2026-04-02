@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Criar Atalho na Area de Trabalho                     ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo Criando atalho na sua Area de Trabalho...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0criar-atalho.ps1"

echo.
echo Pressione qualquer tecla para fechar...
pause >nul
