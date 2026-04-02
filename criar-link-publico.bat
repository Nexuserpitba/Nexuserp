@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     NexusERP - Criar Link Publico                        ║
echo ║     Acessivel de qualquer lugar do mundo!                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/6] Verificando ngrok...
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Ngrok nao encontrado. Instalando...
    echo.
    
    :: Verifica se o Chocolatey esta instalado
    where choco >nul 2>nul
    if %errorlevel% equ 0 (
        echo Usando Chocolatey para instalar ngrok...
        call choco install ngrok -y
    ) else (
        echo.
        echo ════════════════════════════════════════════════════════════
        echo  INSTRUCAO PARA INSTALAR NGROK MANUALMENTE:
        echo ════════════════════════════════════════════════════════════
        echo.
        echo  1. Acesse: https://ngrok.com/download
        echo  2. Baixe o ngrok para Windows
        echo  3. Extraia o arquivo ngrok.exe para esta pasta
        echo  4. Execute novamente este script
        echo.
        echo  OU use o comando:
        echo  npm install -g ngrok
        echo.
        start https://ngrok.com/download
        pause
        exit /b 1
    )
)

echo Ngrok encontrado!

echo.
echo [2/6] Verificando se o sistema esta rodando...
echo.

:: Verifica se o frontend esta rodando
netstat -an | findstr "5173" >nul
if %errorlevel% neq 0 (
    echo Frontend nao esta rodando. Iniciando sistema...
    call iniciar-sistema.bat
    timeout /t 10 /nobreak >nul
)

echo.
echo [3/6] Configurando ngrok...
echo.
echo Voce precisa de um token de autenticacao do ngrok.
echo.
echo Se voce ainda nao tem:
echo 1. Crie uma conta gratuita em: https://ngrok.com/signup
echo 2. Copie o token em: https://dashboard.ngrok.com/get-started/your-authtoken
echo.

set /p token="Cole seu token do ngrok aqui (ou pressione Enter para pular): "

if not "%token%"=="" (
    ngrok config add-authtoken %token%
    echo Token configurado!
) else (
    echo.
    echo AVISO: Sem token, o link sera temporario e pode ter limitacoes.
    echo Recomendamos criar uma conta gratuita no ngrok.
    echo.
)

echo.
echo [4/6] Criando tunel publico para o Frontend (porta 5173)...
echo.
echo ════════════════════════════════════════════════════════════
echo  AGUARDE! O link sera exibido abaixo...
echo ════════════════════════════════════════════════════════════
echo.

start "Ngrok Frontend" cmd /k "ngrok http 5173"

timeout /t 5 /nobreak >nul

echo.
echo [5/6] Criando tunel publico para o Backend BI (porta 3002)...
echo.
start "Ngrok Backend" cmd /k "ngrok http 3002"

timeout /t 3 /nobreak >nul

echo.
echo [6/6] Abrindo painel do ngrok...
echo.
start http://localhost:4040

echo.
echo ════════════════════════════════════════════════════════════
echo  🎉 LINKS PUBLICOS CRIADOS!
echo ════════════════════════════════════════════════════════════
echo.
echo  Os links foram abertos em janelas separadas.
echo  Copie os links que comecam com https://....ngrok.io
echo.
echo  📊 Dashboard:     https://SEU-LINK.ngrok.io
echo  🧠 Dashboard BI:  https://SEU-LINK.ngrok.io/bi
echo  📦 Backend API:   https://SEU-LINK-BACKEND.ngrok.io
echo.
echo  O painel do ngrok mostra todos os links em: http://localhost:4040
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo  IMPORTANTE:
echo  - Os links funcionam enquanto o ngrok estiver rodando
echo  - Para links permanentes, use Vercel ou Netlify
echo  - Feche as janelas do ngrok para encerrar os links
echo.
pause
