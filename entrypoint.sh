#!/bin/bash

# Start the Flask app in the background
python main.py &
flask_pid=$!

# Give Flask a moment to start
sleep 2

# Seed the database
python seed.py

# Start the cloudflared tunnel in a background loop
echo "Starting Cloudflare Quick Tunnel..."

(
    while true; do
        > tunnel.log
        
        # Start a quick tunnel (anonymous, free, no account)
        cloudflared tunnel --url http://localhost:8080 > tunnel.log 2>&1 &
        cf_pid=$!
        
        # Wait for the URL to appear in the log
        TUNNEL_URL=""
        for i in {1..30}; do
            # Cloudflare URLs look like: https://something.trycloudflare.com
            TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" tunnel.log | tail -n 1)
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
            echo "Could not parse Cloudflare URL. Content of tunnel.log:"
            cat tunnel.log
        fi
        
        # Wait until the process dies before restarting
        wait $cf_pid
        echo "Tunnel connection lost. Reconnecting in 5s..."
        sleep 5
    done
) &

# Keep the script running attached to the Flask process
wait $flask_pid

