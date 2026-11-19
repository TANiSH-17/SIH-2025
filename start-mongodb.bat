@echo off
title AayuLink - MongoDB Service
echo ====================================================
echo Starting AayuLink local MongoDB on port 27017...
echo Database directory: %~dp0data\db
echo ====================================================
"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath "%~dp0data\db" --bind_ip 127.0.0.1 --port 27017
pause
