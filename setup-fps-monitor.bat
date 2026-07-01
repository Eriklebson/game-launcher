@echo off
echo ============================================
echo   Game Launcher - FPS Monitor Setup
echo ============================================
echo.
echo This script adds you to the "Performance Log Users" group.
echo This allows PresentMon to monitor FPS WITHOUT admin/UAC.
echo.
echo You will be prompted for administrator password.
echo.
net localgroup "Performance Log Users" %USERNAME% /add
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! You can now use FPS monitoring without UAC.
    echo Please restart the Game Launcher app.
) else (
    echo.
    echo Try running: net localgroup "Performance Log Users" %USERNAME% /add
    echo Or run this script as Administrator.
)
echo.
pause
