@echo off
cd /d "%~dp0"
start "NexusERP Server" cmd /k "npx http-server dist -p 3000"
