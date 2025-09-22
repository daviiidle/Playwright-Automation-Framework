# PowerShell script to run tests with live output and file logging
Write-Host "====================================" -ForegroundColor Green
Write-Host "Running Playwright Tests (Live View)" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "Test started at $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

# Clear the output file
"Test started at $(Get-Date)" | Out-File -FilePath "test-output.log" -Encoding UTF8

# Run playwright and capture output to both console and file
$process = Start-Process -FilePath "npx" -ArgumentList "playwright", "test" -PassThru -NoNewWindow -RedirectStandardOutput "temp-stdout.log" -RedirectStandardError "temp-stderr.log"

# Monitor the output files and display content as it's written
$lastSize = 0
while (!$process.HasExited) {
    Start-Sleep -Milliseconds 500

    if (Test-Path "temp-stdout.log") {
        $content = Get-Content "temp-stdout.log" -Raw -ErrorAction SilentlyContinue
        if ($content -and $content.Length -gt $lastSize) {
            $newContent = $content.Substring($lastSize)
            Write-Host $newContent -NoNewline
            $lastSize = $content.Length
        }
    }
}

# Wait for process to complete
$process.WaitForExit()

# Get any remaining output
if (Test-Path "temp-stdout.log") {
    $content = Get-Content "temp-stdout.log" -Raw -ErrorAction SilentlyContinue
    if ($content -and $content.Length -gt $lastSize) {
        $newContent = $content.Substring($lastSize)
        Write-Host $newContent -NoNewline
    }

    # Save to main log file
    $content | Out-File -FilePath "test-output.log" -Encoding UTF8 -Append
}

if (Test-Path "temp-stderr.log") {
    $errorContent = Get-Content "temp-stderr.log" -Raw -ErrorAction SilentlyContinue
    if ($errorContent) {
        Write-Host $errorContent -ForegroundColor Red
        $errorContent | Out-File -FilePath "test-output.log" -Encoding UTF8 -Append
    }
}

# Clean up temp files
Remove-Item "temp-stdout.log" -ErrorAction SilentlyContinue
Remove-Item "temp-stderr.log" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Tests completed!" -ForegroundColor Green
Write-Host "Full output saved to: test-output.log" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Green