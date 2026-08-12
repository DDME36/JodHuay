@echo off
cd /d "%~dp0"
title JodHuay Local App
node server.mjs
if errorlevel 1 pause
