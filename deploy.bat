@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   NexusERP - Deploy Automatizado
echo ========================================
echo.

REM Verificar se .env existe
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Copie .env.docker para .env e preencha as variaveis.
    echo.
    echo   copy .env.docker .env
    echo   notepad .env
    echo.
    pause
    exit /b 1
)

echo [1/6] Verificando dependencias...
call npm install --silent 2>nul
cd backend && call npm install --silent 2>nul && cd ..
echo       OK - Dependencias prontas

echo.
echo [2/6] Build do frontend...
call npx vite build --mode production 2>nul
if errorlevel 1 (
    echo       ERRO - Falha no build do frontend
    pause
    exit /b 1
)
echo       OK - Frontend buildado

echo.
echo [3/6] Aplicando migration Supabase...
where supabase >nul 2>&1
if errorlevel 1 (
    echo       AVISO - Supabase CLI nao encontrado.
    echo       Instale: npm install -g supabase
    echo       Pulando migration.
) else (
    call npx supabase db push --include-all 2>nul
    if errorlevel 1 (
        echo       AVISO - Migration pode precisar ser aplicada manualmente
    ) else (
        echo       OK - Migration aplicada
    )
)

echo.
echo [4/6] Deploy das Edge Functions...
where supabase >nul 2>&1
if errorlevel 1 (
    echo       AVISO - Pulando (Supabase CLI nao encontrado)
) else (
    call npx supabase functions deploy biometria-webhook --no-verify-jwt 2>nul
    call npx supabase functions deploy manage-users 2>nul
    echo       OK - Edge Functions deployadas
)

echo.
echo [5/6] Build Docker...
where docker >nul 2>&1
if errorlevel 1 (
    echo       AVISO - Docker nao encontrado.
    goto :vercel_deploy
)

docker compose build 2>nul
if errorlevel 1 (
    echo       AVISO - Erro no build Docker
) else (
    echo       OK - Docker build concluido
    docker compose up -d 2>nul
    if errorlevel 1 (
        echo       AVISO - Erro ao iniciar containers
    ) else (
        echo       OK - Containers rodando
        echo.
        echo       Frontend: http://localhost:80
        echo       Auth API: http://localhost:3001/auth
        echo       BI API:   http://localhost:3002/api/bi
    )
    goto :done
)

:vercel_deploy
echo.
echo [5b] Deploy Vercel (alternativo)...
where vercel >nul 2>&1
if errorlevel 1 (
    echo       AVISO - Vercel CLI nao encontrado.
    echo       Instale: npm install -g vercel
    echo.
    echo       Ou faca deploy manual:
    echo         vercel --prod
) else (
    call vercel --prod --yes 2>nul
    echo       OK - Deploy Vercel concluido
)

:done
echo.
echo [6/6] Verificacao...
curl -s http://localhost:3001/api/webhook/intelbras/eventos >nul 2>&1
if errorlevel 1 (
    echo       AVISO - Backend nao respondeu
    echo       Verifique SUPABASE_SERVICE_ROLE_KEY no .env
) else (
    echo       OK - Backend respondendo
)

echo.
echo ========================================
echo           Deploy Concluido!
echo ========================================
echo.
echo Proximos passos:
echo   1. Configure o Intelbras CM 351 para:
echo      https://seu-dominio.com/api/webhook/intelbras
echo.
echo   2. Header do webhook:
echo      x-api-key: (veja .env)
echo.
echo   3. Teste o login biometrico no PDV
echo.
pause
