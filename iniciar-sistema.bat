@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     NexusERP - Iniciar Sistema Completo                  ║
echo ║     Frontend + Backend BI                                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/5] Verificando dependencias...
echo.

if not exist node_modules (
    echo Instalando dependencias do frontend...
    call npm install
    if %errorlevel% neq 0 (
        echo Erro ao instalar dependencias do frontend
        pause
        exit /b 1
    )
)

if not exist backend\node_modules (
    echo Instalando dependencias do backend...
    cd backend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo Erro ao instalar dependencias do backend
        pause
        exit /b 1
    )
)

echo Dependencias OK!

echo.
echo [2/5] Criando pasta de dados BI...
if not exist backend\bi_data mkdir backend\bi_data

echo.
echo [3/5] Iniciando Backend BI na porta 3002...
echo.
start "Backend BI - NexusERP" cmd /k "cd backend && node bi-api.js"

echo Aguardando backend iniciar...
timeout /t 3 /nobreak >nul

echo.
echo [4/5] Iniciando Frontend na porta 5173...
echo.
start "Frontend - NexusERP" cmd /k "npm run dev"

echo Aguardando frontend iniciar...
timeout /t 5 /nobreak >nul

echo.
echo [5/5] Abrindo navegador...
echo.
start http://localhost:5173

echo.
echo ════════════════════════════════════════════════════════════
echo  🚀 SISTEMA INICIADO COM SUCESSO!
echo ════════════════════════════════════════════════════════════
echo.
echo  📊 Dashboard Principal: http://localhost:5173
echo  🧠 Dashboard BI:        http://localhost:5173/bi
echo  📦 Backend BI API:      http://localhost:3002
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo  Para criar um link PUBLICO (acessivel de qualquer lugar):
echo  Execute: criar-link-publico.bat
echo.
echo  Para parar o sistema, feche as janelas do servidor.
echo.
pause
