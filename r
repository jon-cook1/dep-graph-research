#!/bin/bash

# Kill child processes on Ctrl-C
trap "kill 0" SIGINT

(cd server && python3 api.py) &
(cd client && npm start) &

wait
