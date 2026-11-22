@echo off
set LOG=C:\Users\bobby\autoconnect\build-all.log
echo Build started %DATE% %TIME% > "%LOG%"
echo.
echo === BACKEND: tests ===
echo === BACKEND: tests === >> "%LOG%"
cd /d C:\Users\bobby\progressive-autohub-backend
call npm test >> "%LOG%" 2>&1
echo === BACKEND: build === >> "%LOG%"
call npm run build >> "%LOG%" 2>&1
echo === FRONTEND: typecheck === >> "%LOG%"
cd /d C:\Users\bobby\autoconnect
call npm run typecheck >> "%LOG%" 2>&1
echo === FRONTEND: tests === >> "%LOG%"
call npm test >> "%LOG%" 2>&1
echo === FRONTEND: build === >> "%LOG%"
call npm run build >> "%LOG%" 2>&1
echo === FINISHED === >> "%LOG%"
echo.
echo Finished. Log saved to %LOG%
echo Tell Claude "build finished" and it will read the log and fix anything that failed.
pause
