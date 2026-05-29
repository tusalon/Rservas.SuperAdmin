@echo off
setlocal

set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if not exist "%NODE_EXE%" (
  echo No se encontro Node en "%NODE_EXE%".
  echo Instala Node.js o ajusta la ruta dentro de update-client-and-apk.bat.
  exit /b 1
)

"%NODE_EXE%" "%~dp0tools\update-client-and-apk.js" %*
