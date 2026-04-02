@echo off
title NexusERP - Servidor
cd /d "%~dp0"
echo Iniciando servidor...
npx http-server dist -p 3000
