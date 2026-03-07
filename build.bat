@echo off
setlocal enabledelayedexpansion

echo Generando nueva version...

:: Obtener fecha y hora
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I

set year=%datetime:~0,4%
set month=%datetime:~4,2%
set day=%datetime:~6,2%
set hour=%datetime:~8,2%
set minute=%datetime:~10,2%

set version=%year%.%month%.%day%-%hour%.%minute%
set buildDate=%year%-%month%-%day%T%hour%:%minute%:00.000Z

echo Version: %version%

:: Actualizar version.json
echo {> version.json
echo   "version": "%version%",>> version.json
echo   "buildDate": "%buildDate%">> version.json
echo }>> version.json

:: Actualizar CACHE_NAME en sw.js
powershell -Command "(Get-Content sw.js) -replace 'const CACHE_NAME = ''verificador-billetes-[^']*'';', 'const CACHE_NAME = ''verificador-billetes-%version%'';' | Set-Content sw.js"

echo.
echo Version actualizada correctamente!
echo CACHE_NAME: verificador-billetes-%version%
echo.
pause
