#!/usr/bin/env bash
cd "$(dirname "$0")"
python3 -m http.server 8000 &
SERVER_PID=$!
printf "Dashboard: http://localhost:8000\nPress Ctrl+C to stop.\n"
trap "kill $SERVER_PID" INT TERM EXIT
wait $SERVER_PID
