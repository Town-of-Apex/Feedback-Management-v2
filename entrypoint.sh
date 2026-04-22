#!/bin/bash

# Start the Flask app in the background
python main.py &
flask_pid=$!

# Give Flask a moment to start
sleep 2

# Seed the database
python seed.py

# Start the localhost.run tunnel in a background loop to keep it alive
echo "Starting localhost.run tunnel manager..."

(
    # Continuous tunnel loop
    while true; do
        # Clear the log for this session
        > tunnel.log
        
        # Launch SSH tunnel. Keepalive prevents silent drops
        ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 80:localhost:8080 nokey@localhost.run > tunnel.log 2>&1 &
        ssh_pid=$!
        
        # Wait for the URL to appear in the log
        TUNNEL_URL=""
        for i in {1..30}; do
            TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.lhr\.life|https://[a-zA-Z0-9.-]+\.localhost\.run|https://[a-zA-Z0-9.-]+\.lhr\.pro" tunnel.log | grep -v "admin" | tail -n 1)
            if [ -n "$TUNNEL_URL" ]; then
                break
            fi
            sleep 1
        done
        
        if [ -n "$TUNNEL_URL" ]; then
            # Format and save the new URL
            BASE_PATH_CLEAN=$(echo ${BASE_PATH:-/feedback} | sed 's/\/$//')
            FULL_URL="$TUNNEL_URL$BASE_PATH_CLEAN/?key=$EVENT_KEY"
            
            echo "$FULL_URL" > app/static/tunnel_url.txt
            python -c "import qrcode, os; bp = os.getenv('BASE_PATH', '/feedback').rstrip('/'); img = qrcode.make('$TUNNEL_URL' + bp + '/?key=' + os.getenv('EVENT_KEY', '')); img.save('app/static/qr.png')"
            
            echo "Tunnel Up: $FULL_URL"
        else
            echo "Could not parse tunnel URL. Check tunnel.log"
        fi
        
        # Wait until the SSH process dies before restarting
        wait $ssh_pid
        echo "Tunnel connection lost. Reconnecting in 3s..."
        sleep 3
    done
) &

# Keep the script running attached to the Flask process
wait $flask_pid

