@echo off
cd /d "%~dp0"
title FlatFolks Production Server

echo Checking MariaDB...
powershell -NoProfile -Command "if (-not (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -FilePath 'C:\Program Files\MariaDB 12.3\bin\mariadbd.exe' -ArgumentList '--defaults-file=\"C:\Program Files\MariaDB 12.3\data\my.ini\"' -WindowStyle Hidden }"
timeout /t 3 /nobreak >nul

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
