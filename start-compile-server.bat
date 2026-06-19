@echo off
echo.
echo  Starting STEMVerse Compile Server...
echo  =====================================
echo.
cd /d "%~dp0..\.."
node apps/web/compile-server.js
pause
