@echo off
cd /d "%~dp0"
title Roomlio Production Server
echo Removing the previous Roomlio build...
if exist ".next\" rmdir /s /q ".next"
echo Building Roomlio...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. The server was not started.
  pause
  exit /b 1
)
echo Starting Roomlio at http://localhost:3000
echo.
call npm.cmd run start
echo.
echo The Roomlio server has stopped.
pause
