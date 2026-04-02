$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\NexusERP.lnk")
$Shortcut.TargetPath = "C:\Users\Denner\.gemini\NexusERP\INICIAR-TUDO.bat"
$Shortcut.WorkingDirectory = "C:\Users\Denner\.gemini\NexusERP"
$Shortcut.Description = "NexusERP - Sistema de Gestao com BI Inteligente"
$Shortcut.IconLocation = "shell32.dll,44"
$Shortcut.Save()

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  ATALHO CRIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Um atalho foi criado na sua Area de Trabalho:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  NexusERP.lnk" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Basta clicar duplo no atalho para iniciar!" -ForegroundColor Yellow
Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
