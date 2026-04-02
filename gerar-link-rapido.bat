@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║           GERAR LINK - NexusERP                          ║
echo ║           Metodo mais rapido: NETLIFY DROP                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] Gerando build de producao...
echo.
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro ao gerar build!
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Build gerado com sucesso!
echo.

echo [2/3] Abrindo Netlify Drop no navegador...
echo.
start https://app.netlify.com/drop

echo [3/3] Instrucoes:
echo.
echo ════════════════════════════════════════════════════════════
echo  1. A janela do Netlify abriu no seu navegador
echo.
echo  2. Arraste a pasta 'dist' que esta na raiz do projeto
echo     para a area indicada no site
echo.
echo  3. AGUARDE o upload (pode demorar alguns segundos)
echo.
echo  4. SEU LINK SERA GERADO AUTOMATICAMENTE!
echo     Exemplo: https://seu-app.netlify.app
echo.
echo  5. Copie o link e compartilhe!
echo ════════════════════════════════════════════════════════════
echo.

echo Abrindo pasta dist para facilitar o arrastar...
explorer dist

echo.
echo Pressione qualquer tecla quando terminar...
pause >nul

echo.
echo 🎉 Link gerado com sucesso!
echo.
echo Dica: Salve o link gerado. Voce pode acessar a qualquer momento!
echo.
pause
