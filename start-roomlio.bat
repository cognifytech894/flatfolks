@echo off
cd /d "%~dp0"
title FlatFolks Production Server

echo Removing the previous FlatFolks build...
if exist ".next\" rmdir /s /q ".next"
echo Building FlatFolks...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. The server was not started.
  pause
  exit /b 1
)
echo Starting FlatFolks at http://localhost:3000
echo.
call npm.cmd run start
echo.
echo The FlatFolks server has stopped.
pause
