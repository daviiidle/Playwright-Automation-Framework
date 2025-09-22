# Scripts Directory

This directory contains utility scripts for running tests and managing the project.

## Files

- `run-tests.bat` - Windows batch file for running tests
- `run-tests-live.bat` - Windows batch file for running tests with live updates
- `run-tests-live.ps1` - PowerShell script for running tests with live updates
- `toggle-retries.js` - Node.js script for toggling test retries in configuration

## Usage

Run these scripts from the project root directory:

```bash
# Windows batch files
./scripts/run-tests.bat
./scripts/run-tests-live.bat

# PowerShell
./scripts/run-tests-live.ps1

# Node.js script
node scripts/toggle-retries.js
```