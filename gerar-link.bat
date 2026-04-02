@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     NexusERP - Gerador de Link de Deploy                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo Escolha uma opcao de deploy:
echo.
echo [1] Vercel (Recomendado - 2 minutos)
echo [2] Netlify (Arrastar e soltar)
echo [3] GitHub Pages
echo [4] Apenas gerar build local
echo [5] Iniciar servidor local para teste
echo [0] Sair
echo.

set /p opcao="Digite o numero da opcao: "

if "%opcao%"=="1" goto vercel
if "%opcao%"=="2" goto netlify
if "%opcao%"=="3" goto github
if "%opcao%"=="4" goto build
if "%opcao%"=="5" goto local
if "%opcao%"=="0" goto sair

:vercel
echo.
echo ════════════════════════════════════════════════════════════
echo  VERCEL - Deploy Automatizado
echo ════════════════════════════════════════════════════════════
echo.
echo Verificando se o Vercel CLI esta instalado...
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Vercel CLI nao encontrado. Instalando...
    call npm install -g vercel
    if %errorlevel% neq 0 (
        echo Erro ao instalar Vercel CLI
        pause
        goto sair
    )
    echo Vercel CLI instalado com sucesso!
)

echo.
echo Gerando build de producao...
call npm run build
if %errorlevel% neq 0 (
    echo Erro ao gerar build
    pause
    goto sair
)

echo.
echo Iniciando deploy no Vercel...
echo.
echo ATENCAO: Siga as instrucoes na tela:
echo   - Link to existing project? N
echo   - Project name? nexuserp
echo   - Directory? ./
echo   - Override settings? N
echo.
call vercel --prod

echo.
echo ════════════════════════════════════════════════════════════
echo  Deploy concluido! O link sera exibido acima.
echo ════════════════════════════════════════════════════════════
pause
goto sair

:netlify
echo.
echo ════════════════════════════════════════════════════════════
echo  NETLIFY - Deploy Manual
echo ════════════════════════════════════════════════════════════
echo.
echo Gerando build de producao...
call npm run build
if %errorlevel% neq 0 (
    echo Erro ao gerar build
    pause
    goto sair
)

echo.
echo Build gerado com sucesso!
echo.
echo Proximos passos:
echo 1. Acesse: https://app.netlify.com/drop
echo 2. Arraste a pasta 'dist' para o navegador
echo 3. Seu link sera gerado automaticamente!
echo.
echo Abrindo Netlify no navegador...
start https://app.netlify.com/drop
echo.
pause
goto sair

:github
echo.
echo ════════════════════════════════════════════════════════════
echo  GITHUB PAGES - Deploy
echo ════════════════════════════════════════════════════════════
echo.
echo Verificando se gh-pages esta instalado...
call npm list gh-pages >nul 2>nul
if %errorlevel% neq 0 (
    echo Instalando gh-pages...
    call npm install gh-pages --save-dev
)

echo.
echo Gerando build e fazendo deploy...
call npm run build
if %errorlevel% neq 0 (
    echo Erro ao gerar build
    pause
    goto sair
)

call npx gh-pages -d dist
if %errorlevel% neq 0 (
    echo Erro ao fazer deploy
    echo Certifique-se de ter um repositorio Git configurado
    pause
    goto sair
)

echo.
echo Deploy concluido!
echo Seu site estara disponivel em alguns minutos em:
echo https://seunome.github.io/nexuserp
echo.
pause
goto sair

:build
echo.
echo ════════════════════════════════════════════════════════════
echo  Gerando Build de Producao
echo ════════════════════════════════════════════════════════════
echo.
call npm run build
if %errorlevel% neq 0 (
    echo Erro ao gerar build
    pause
    goto sair
)

echo.
echo Build gerado com sucesso!
echo Pasta: dist/
echo.
echo Para deploy manual, faca upload da pasta 'dist' para:
echo - Netlify Drop: https://app.netlify.com/drop
echo - Surge.sh: https://surge.sh
echo - Qualquer servidor web estatico
echo.
explorer dist
pause
goto sair

:local
echo.
echo ════════════════════════════════════════════════════════════
echo  Iniciando Servidor Local
echo ════════════════════════════════════════════════════════════
echo.
echo Iniciando backend BI...
start "Backend BI" cmd /k "cd backend && node bi-api.js"

echo.
echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo Iniciando frontend...
echo.
echo ════════════════════════════════════════════════════════════
echo  Acesse: http://localhost:5173
echo  Dashboard BI: http://localhost:5173/bi
echo ════════════════════════════════════════════════════════════
echo.
call npm run dev
goto sair

:sair
exit /b 0
