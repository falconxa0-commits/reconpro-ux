#!/bin/bash
cd /home/z/my-project
PORT=3000 npx next dev -H 127.0.0.1 -p 3000 &
echo $! > /tmp/next-server.pid
wait
