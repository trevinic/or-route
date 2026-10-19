@echo off
if exist "%~dp0avvia_or_route.bat" (
    call "%~dp0avvia_or_route.bat"
) else (
    call "%~dp0avvia_optifleet.bat"
)
