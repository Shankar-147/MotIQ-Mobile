@echo off
rem Stops everything that run-demo.bat started.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-demo.ps1"
echo.
pause
