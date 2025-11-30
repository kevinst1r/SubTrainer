@echo off
cd /d "%~dp0"
echo Installing/Updating dependencies...
pip install -r editor/requirements.txt
if %errorlevel% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b
)

echo Starting Editor...
python editor/main.py
pause

