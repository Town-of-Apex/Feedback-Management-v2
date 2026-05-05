#!/bin/bash

# Start the Flask app in the background
python main.py &
flask_pid=$!

# Give Flask a moment to start
sleep 2

# Seed the database
python seed.py

# Start the cloudflared tunnel in a background loop
# Quick tunnels default to QUIC (UDP). Many VMs and corporate networks block UDP to
# Cloudflare; use HTTP/2 over TCP unless overridden (e.g. CLOUDFLARED_PROTOCOL=quic).
CF_PROTOCOL="${CLOUDFLARED_PROTOCOL:-http2}"
echo "Starting Cloudflare Quick Tunnel (edge protocol: ${CF_PROTOCOL})..."

(
    while true; do
        > tunnel.log
        
        # Start a quick tunnel (anonymous, free, no account)
        cloudflared tunnel --url http://localhost:8080 --protocol "$CF_PROTOCOL" > tunnel.log 2>&1 &
        cf_pid=$!
        
        # Wait for the URL to appear in the log (quick tunnel prints it inside a box; allow slow networks)
        TUNNEL_URL=""
        for i in $(seq 1 60); do
            # Quick tunnel hostnames look like: https://random-words.trycloudflare.com
            # Logs also mention https://api.trycloudflare.com — that is the control plane, not the tunnel; never QR that.
            TUNNEL_URL=$(
                grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' tunnel.log \
                    | grep -Fv 'https://api.trycloudflare.com' \
                    | tail -n 1
            )
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
            # Build QR from env only (avoids shell quoting breaking Python when EVENT_KEY has quotes/special chars)
            export TUNNEL_URL_QR_BASE="$TUNNEL_URL"
            python -c "import os, qrcode; u=os.environ['TUNNEL_URL_QR_BASE']; bp=os.getenv('BASE_PATH', '/feedback').rstrip('/'); img=qrcode.make(u + bp + '/?key=' + os.getenv('EVENT_KEY', '')); img.save('app/static/qr.png')"
            unset TUNNEL_URL_QR_BASE
            
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

