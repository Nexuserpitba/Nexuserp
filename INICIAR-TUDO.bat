@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     🚀 NexusERP - INICIAR TUDO AUTOMATICAMENTE 🚀         ║
echo ║                                                            ║
echo ║     Sistema completo com link publico                      ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo ⏳ Aguarde... Configurando tudo para voce!
echo.

:: ============================================
:: ETAPA 1: Verificar Node.js
:: ============================================
echo [1/7] Verificando Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ❌ Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js em: https://nodejs.org
    echo.
    start https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js encontrado!

:: ============================================
:: ETAPA 2: Instalar dependencias
:: ============================================
echo.
echo [2/7] Instalando dependencias do Frontend...
if not exist node_modules (
    call npm install --silent
)
echo ✅ Frontend pronto!

echo.
echo [3/7] Instalando dependencias do Backend BI...
if not exist backend\node_modules (
    cd backend
    call npm install --silent
    cd ..
)
echo ✅ Backend pronto!

:: ============================================
:: ETAPA 3: Criar estrutura de dados
:: ============================================
echo.
echo [4/7] Criando estrutura de dados...
if not exist backend\bi_data mkdir backend\bi_data

:: Criar dados de exemplo se nao existirem
if not exist backend\bi_data\sales.json (
    echo [] > backend\bi_data\sales.json
)
if not exist backend\bi_data\financial.json (
    echo [] > backend\bi_data\financial.json
)
echo ✅ Dados prontos!

:: ============================================
:: ETAPA 4: Iniciar Backend BI
:: ============================================
echo.
echo [5/7] Iniciando Backend BI (porta 3002)...
start "Backend BI - NexusERP" /MIN cmd /k "cd backend && node bi-api.js"
timeout /t 3 /nobreak >nul
echo ✅ Backend rodando!

:: ============================================
:: ETAPA 5: Iniciar Frontend
:: ============================================
echo.
echo [6/7] Iniciando Frontend (porta 5173)...
start "Frontend - NexusERP" /MIN cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
echo ✅ Frontend rodando!

:: ============================================
:: ETAPA 6: Criar links publicos
:: ============================================
echo.
echo [7/7] Criando links publicos...
echo.

:: Instalar localtunnel globalmente
call npm install -g localtunnel --silent 2>nul

:: Criar link para Frontend
start "Link Publico - Frontend" cmd /k "echo ════════════════════════════════════════════════════════════ && echo LINK PUBLICO DO FRONTEND (copie este link): && echo ════════════════════════════════════════════════════════════ && echo. && lt --port 5173"

:: Criar link para Backend
start "Link Publico - Backend" cmd /k "echo ════════════════════════════════════════════════════════════ && echo LINK PUBLICO DO BACKEND (copie este link): && echo ════════════════════════════════════════════════════════════ && echo. && lt --port 3002"

timeout /t 8 /nobreak >nul

:: ============================================
:: FINALIZACAO
:: ============================================
echo.
echo Abrindo o sistema no navegador...
start http://localhost:5173

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     ✅ SISTEMA INICIADO COM SUCESSO! ✅                    ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo ════════════════════════════════════════════════════════════
echo  📊 ACESSO LOCAL (seu computador):
echo ════════════════════════════════════════════════════════════
echo.
echo     Dashboard:       http://localhost:5173
echo     Dashboard BI:    http://localhost:5173/bi
echo     API Backend:     http://localhost:3002
echo.
echo ════════════════════════════════════════════════════════════
echo  🌐 ACESSO PUBLICO (de qualquer lugar):
echo ════════════════════════════════════════════════════════════
echo.
echo     Verifique as janelas que abriram acima!
echo     Copie os links que comecam com https://
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo  📝 INSTRUCOES:
echo.
echo  1. Os links publicos estao nas janelas que abriram
echo  2. Copie o link do FRONTEND para acessar o sistema
echo  3. Compartilhe o link com quem precisa acessar
echo  4. Para encerrar, feche todas as janelas
echo.
echo ════════════════════════════════════════════════════════════
echo.
pause
