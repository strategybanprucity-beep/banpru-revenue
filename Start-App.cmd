@echo off
cd /d "%~dp0"
set "app_node=node"
where node >nul 2>nul
if errorlevel 1 set "app_node=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
echo Banphrucity. - http://127.0.0.1:5173/
"%app_node%" scripts/run-framework.mjs dev
pause
