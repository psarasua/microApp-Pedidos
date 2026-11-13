#!/usr/bin/env bash
# Instala en VS Code las extensiones recomendadas del proyecto (.vscode/extensions.json).
# Uso, desde la carpeta del proyecto, en Git Bash:  bash scripts/instalar-extensiones.sh
set -u
if ! command -v code >/dev/null 2>&1; then
  echo "No se encontró el comando 'code'. Abre VS Code, pulsa Ctrl+Shift+P y ejecuta:"
  echo "  Shell Command: Install 'code' command in PATH"
  echo "Luego cierra y abre esta terminal e inténtalo de nuevo."
  exit 1
fi
fallidas=0
for ext in $(grep -o '"[a-zA-Z0-9-]*\.[a-zA-Z0-9.-]*"' .vscode/extensions.json | tr -d '"'); do
  echo "Instalando $ext ..."
  code --install-extension "$ext" --force || { echo "  No se pudo instalar $ext"; fallidas=$((fallidas + 1)); }
done
echo
if [ "$fallidas" -eq 0 ]; then echo "Listo: todas las extensiones quedaron instaladas. Reinicia VS Code."; else echo "Terminó con $fallidas extensión(es) sin instalar. Revisa los mensajes de arriba."; fi
