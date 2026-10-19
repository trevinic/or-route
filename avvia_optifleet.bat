@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title OR-Route - Algoritmo e Server Web

echo ===========================================================================
echo                 OR-ROUTE - RICERCA OPERATIVA
echo    Piattaforma di Ottimizzazione Flotte (CARP, CVRP, VRPTW, EV-VRP)
echo ===========================================================================
echo.

:: 1. Individua la cartella di lavoro corretta
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%rsu_carp_optimization\server.py" (
    cd /d "%SCRIPT_DIR%rsu_carp_optimization"
) else (
    cd /d "%SCRIPT_DIR%"
)

:: 2. Rileva l'interprete Python (priorita' all'ambiente virtuale .venv)
set "PYTHON_EXE="
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else if exist "..\rsu_carp_optimization\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=..\rsu_carp_optimization\.venv\Scripts\python.exe"
) else if exist "..\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=..\.venv\Scripts\python.exe"
) else (
    where python >nul 2>nul
    if !errorlevel! equ 0 (
        set "PYTHON_EXE=python"
    )
)

if "%PYTHON_EXE%"=="" (
    echo [ERRORE] Interprete Python non trovato.
    echo Assicurati che l'ambiente virtuale .venv sia presente oppure che Python sia nel PATH.
    echo.
    pause
    exit /b 1
)

echo [OK] Interprete Python rilevato: %PYTHON_EXE%
echo [OK] Directory di lavoro: %CD%
echo.

:: 3. Esecuzione Algoritmo di Ottimizzazione CARP
echo ---------------------------------------------------------------------------
echo  [FASE 1/3] Esecuzione Algoritmo CARP e Generazione Mappa GIS (Folium)
echo ---------------------------------------------------------------------------
"%PYTHON_EXE%" main.py
if !errorlevel! neq 0 (
    echo [AVVISO] L'algoritmo ha terminato con codice !errorlevel!, proseguo con l'avvio del server...
)
echo.

:: 4. Apertura Browser Web in background dopo 2 secondi
echo ---------------------------------------------------------------------------
echo  [FASE 2/3] Apertura Browser Web su http://localhost:8085
echo ---------------------------------------------------------------------------
start "" /b cmd /c "ping 127.0.0.1 -n 3 >nul && start http://localhost:8085/"
echo [OK] Il browser predefinito verra' aperto automaticamente tra pochi secondi.
echo.

:: 5. Avvio Server Web Locale
echo ---------------------------------------------------------------------------
echo  [FASE 3/3] Avvio Server Web Locale OptiFleet (server.py)
echo ---------------------------------------------------------------------------
echo  * Indirizzo Web:      http://localhost:8085/
echo  * Mappa GIS RSU:      http://localhost:8085/output/percorso_raccolta.html
echo  * Modelli Supportati: CARP, CVRP, VRPTW, WCVRPTW-IF / EV-VRP
echo.
echo  [INFO] Premi CTRL+C in questa finestra per arrestare il server.
echo ===========================================================================
echo.

"%PYTHON_EXE%" server.py

if !errorlevel! neq 0 (
    echo.
    echo [AVVISO] Il server e' stato interrotto o si e' verificato un errore.
    pause
)
