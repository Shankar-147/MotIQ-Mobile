@echo off
rem Starts the MotIQ demo and opens a window for the admin, a customer and a provider.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-demo.ps1" %*
echo.
pause
