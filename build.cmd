@echo off
chcp 65001 >nul
echo ========================================
echo   VideoUniquer Pro - сборка EXE
echo ========================================
echo.

if exist "resources\bin\win\ffmpeg.exe" goto :build
if exist "resources\bin\ffmpeg.exe" (
  echo Перенесите ffmpeg.exe и ffprobe.exe в resources\bin\win\
  pause
  exit /b 1
)

echo [ОШИБКА] Положите ffmpeg.exe и ffprobe.exe в resources\bin\win\
pause
exit /b 1

:build
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run build:win

if %ERRORLEVEL% EQU 0 (
  echo.
  echo Готово!
  echo Установщик: release\VideoUniquer Pro-Setup-1.0.0.exe
  echo Portable:     release\win-unpacked\VideoUniquer Pro.exe
) else (
  echo.
  echo Сборка завершилась с ошибкой.
)

echo.
pause
