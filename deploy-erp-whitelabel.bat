@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Deploy para erp-whitelabel.vercel.app                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/5] Verificando Vercel CLI...
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo Instalando Vercel CLI...
    call npm install -g vercel
)
echo ✅ Vercel CLI OK!

echo.
echo [2/5] Verificando login...
call vercel whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ════════════════════════════════════════════════════════════
    echo  FAÇA LOGIN NO VERCEL
    echo ════════════════════════════════════════════════════════════
    echo.
    echo  Uma janela do navegador vai abrir para você fazer login.
    echo  Use sua conta do GitHub, GitLab ou Email.
    echo.
    echo  Após fazer login, volte aqui e pressione qualquer tecla.
    echo.
    echo ════════════════════════════════════════════════════════════
    echo.
    
    start https://vercel.com/login
    
    echo Aguardando login...
    timeout /t 5 /nobreak >nul
    
    echo.
    echo Fazendo login via CLI...
    call vercel login
    
    if %errorlevel% neq 0 (
        echo.
        echo Login cancelado ou falhou.
        echo Tente novamente executando: vercel login
        pause
        exit /b 1
    )
)
echo ✅ Login OK!

echo.
echo [3/5] Limpando build anterior...
if exist dist rmdir /s /q dist

echo.
echo [4/5] Gerando build de produção...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Erro ao gerar build!
    pause
    exit /b 1
)
echo ✅ Build gerado!

echo.
echo [5/5] Fazendo deploy para erp-whitelabel...
echo.
echo ════════════════════════════════════════════════════════════
echo  Responda as perguntas que aparecerem:
echo ════════════════════════════════════════════════════════════
echo.
echo  ? Set up and deploy? → Y (Enter)
echo  ? Which scope? → (Enter - selecione sua conta)
echo  ? Link to existing project? → Y
echo  ? What's the name? → erp-whitelabel
echo  ? In which directory? → ./ (Enter)
echo  ? Want to modify settings? → N
echo.
echo ════════════════════════════════════════════════════════════
echo.

call vercel --prod

if %errorlevel% neq 0 (
    echo.
    echo Tentando deploy alternativo...
    call vercel deploy --prod
)

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo  🎉 DEPLOY CONCLUÍDO!
echo.
echo  🌐 Acesse: https://erp-whitelabel.vercel.app
echo  📊 Dashboard BI: https://erp-whitelabel.vercel.app/bi
echo.
echo ════════════════════════════════════════════════════════════
echo.

echo Abrindo o site...
start https://erp-whitelabel.vercel.app

echo.
pause
