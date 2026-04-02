@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     NexusERP - Deploy Automatico VERCEL                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/5] Verificando Vercel CLI...
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo Instalando Vercel CLI...
    call npm install -g vercel
    if %errorlevel% neq 0 (
        echo Erro ao instalar. Tente manualmente: npm i -g vercel
        pause
        exit /b 1
    )
    echo Vercel CLI instalado!
) else (
    echo Vercel CLI encontrado!
)

echo.
echo [2/5] Gerando build de producao...
call npm run build
if %errorlevel% neq 0 (
    echo Erro ao gerar build
    pause
    exit /b 1
)
echo Build concluido!

echo.
echo [3/5] Fazendo login no Vercel...
echo (Se for a primeira vez, uma janela do navegador vai abrir)
call vercel login
if %errorlevel% neq 0 (
    echo Erro no login
    pause
    exit /b 1
)
echo Login realizado!

echo.
echo [4/5] Fazendo deploy...
echo.
echo Responda as perguntas:
echo   - Set up and deploy? Y
echo   - Which scope? (Enter)
echo   - Link to existing? N
echo   - Project name? nexuserp
echo   - Directory? ./  (Enter)
echo   - Override? N
echo.
call vercel --prod

if %errorlevel% neq 0 (
    echo Erro no deploy
    pause
    exit /b 1
)

echo.
echo [5/5] Deploy concluido!
echo.
echo ════════════════════════════════════════════════════════════
echo  🎉 SEU APLICATIVO ESTA ONLINE!
echo ════════════════════════════════════════════════════════════
echo.
echo O link foi exibido acima. Copie e acesse!
echo.
echo Para acessar o Dashboard BI:
echo https://seu-projeto.vercel.app/bi
echo.
echo Para futuros deploys, basta executar:
echo vercel --prod
echo.
pause
