@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     NexusERP - Link Publico Instantaneo                  ║
echo ║     Usando LocalTunnel (sem cadastro!)                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/4] Verificando se o sistema esta rodando...
echo.

:: Verifica se o frontend esta rodando
netstat -an | findstr "5173" >nul
if %errorlevel% neq 0 (
    echo Frontend nao detectado. Iniciando sistema...
    echo.
    start "Frontend" cmd /k "npm run dev"
    timeout /t 8 /nobreak >nul
)

:: Verifica se o backend esta rodando
netstat -an | findstr "3002" >nul
if %errorlevel% neq 0 (
    echo Backend BI nao detectado. Iniciando...
    echo.
    start "Backend BI" cmd /k "cd backend && node bi-api.js"
    timeout /t 3 /nobreak >nul
)

echo Sistema rodando!

echo.
echo [2/4] Instalando localtunnel...
call npm install -g localtunnel
if %errorlevel% neq 0 (
    echo Tentando com npx...
    set USE_NPX=1
) else (
    set USE_NPX=0
)

echo.
echo [3/4] Criando link publico para o Frontend...
echo.

if "%USE_NPX%"=="1" (
    start "Link Frontend" cmd /k "npx localtunnel --port 5173"
) else (
    start "Link Frontend" cmd /k "lt --port 5173"
)

timeout /t 3 /nobreak >nul

echo.
echo [4/4] Criando link publico para o Backend BI...
echo.

if "%USE_NPX%"=="1" (
    start "Link Backend" cmd /k "npx localtunnel --port 3002"
) else (
    start "Link Backend" cmd /k "lt --port 3002"
)

timeout /t 5 /nobreak >nul

echo.
echo ════════════════════════════════════════════════════════════
echo  🎉 LINKS PUBLICOS CRIADOS!
echo ════════════════════════════════════════════════════════════
echo.
echo  Verifique as janelas que abriram para copiar os links.
echo  Os links seguem o padrao: https://nome-aleatorio.loca.lt
echo.
echo  📊 Dashboard Principal: https://XXXX.loca.lt
echo  🧠 Dashboard BI:        https://XXXX.loca.lt/bi
echo  📦 Backend BI API:      https://YYYY.loca.lt
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo  IMPORTANTE:
echo  - Na primeira vez, pode pedir para clicar em "Click to Continue"
echo  - Os links funcionam enquanto as janelas estiverem abertas
echo  - Compartilhe os links com quem precisa acessar
echo.
pause
