@echo off
setlocal enabledelayedexpansion

echo ====================================
echo Running Playwright Tests (Live View)
echo ====================================
echo Test started at %date% %time%
echo.

rem Create a temporary file for the output
set TEMP_FILE=temp-test-output-%RANDOM%.log

rem Run playwright in background and capture output
echo Running tests... (this may take a few minutes)
echo.

rem Start playwright and tee the output
playwright test 2>&1 | (
    for /f "delims=" %%i in ('more') do (
        echo %%i
        echo %%i >> test-output.log
    )
)

echo.
echo ====================================
echo Tests completed!
echo Full output saved to: test-output.log
echo ====================================