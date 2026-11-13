# Instala en VS Code las extensiones recomendadas del proyecto (.vscode/extensions.json).
# Uso, desde la carpeta del proyecto, en PowerShell:  .\scripts\instalar-extensiones.ps1
if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
  Write-Host "No se encontró el comando 'code'. Abre VS Code, pulsa Ctrl+Shift+P y ejecuta: Shell Command: Install 'code' command in PATH"
  exit 1
}
$ext = (Get-Content .vscode/extensions.json -Raw | ConvertFrom-Json).recommendations
$fallidas = 0
foreach ($e in $ext) {
  Write-Host "Instalando $e ..."
  code --install-extension $e --force
  if ($LASTEXITCODE -ne 0) { Write-Host "  No se pudo instalar $e"; $fallidas++ }
}
if ($fallidas -eq 0) { Write-Host "Listo: todas las extensiones quedaron instaladas. Reinicia VS Code." } else { Write-Host "Terminó con $fallidas extensión(es) sin instalar." }
