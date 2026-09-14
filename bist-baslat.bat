@echo off
REM BIST Portfoy Takip - cift tikla calistir.
REM Ilk calistirmada paketleri kurar, .env olusturur, sunucuyu baslatir, tarayiciyi acar.
setlocal enabledelayedexpansion
cd /d "%~dp0"
set PORT=3000

REM Zaten calisiyorsa sadece tarayiciyi ac
curl -s -f -o nul http://localhost:%PORT%/api/health >nul 2>&1
if !errorlevel! equ 0 goto :browser

REM Bagimliliklar eksikse kur
if not exist "node_modules" (
  echo [1/3] Ilk kurulum: paketler yukleniyor, biraz surebilir...
  call npm.cmd install
  if !errorlevel! neq 0 (
    echo Paket kurulumu basarisiz. Interneti kontrol edip tekrar deneyin.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Paketler hazir.
)

REM .env yoksa ornekten olustur
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [2/3] .env olusturuldu. AI ozellikleri icin GEMINI_API_KEY yazmayi unutmayin.
) else (
  echo [2/3] Ayarlar hazir.
)

REM Sunucuyu ayri (kucultulmus) pencerede baslat
echo [3/3] Sunucu baslatiliyor...
start "BIST Portfoy Takip" /min cmd /c "npx.cmd tsx server.ts"

REM Acilmasini bekle (en fazla ~40 sn)
for /L %%i in (1,1,40) do (
  curl -s -f -o nul http://localhost:%PORT%/api/health >nul 2>&1
  if !errorlevel! equ 0 goto :browser
  timeout /t 1 /nobreak >nul
)
echo Sunucu acilamadi. "BIST Portfoy Takip" penceresindeki hataya bakin.
pause
exit /b 1

:browser
if not defined SKIP_BROWSER (
  start "" http://localhost:%PORT%/
)
echo.
echo BIST Portfoy Takip calisiyor: http://localhost:%PORT%/
echo Kapatmak icin gorev cubugundaki "BIST Portfoy Takip" penceresini kapatmaniz yeterli.
endlocal
