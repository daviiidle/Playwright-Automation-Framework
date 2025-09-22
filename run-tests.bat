@echo off
echo ====================================
echo Running Playwright Tests
echo ====================================
echo Test started at %date% %time%
echo.

playwright test > test-output.log 2>&1

echo.
echo ====================================
echo Tests completed!
echo Output saved to: test-output.log
echo ====================================
echo.
echo To view the results:
echo   type test-output.log
echo.
echo Recent results:
echo ====================================
tail -20 test-output.log 2>nul || (
    echo [Showing last 20 lines of test-output.log]
    powershell -Command "Get-Content test-output.log | Select-Object -Last 20"
)