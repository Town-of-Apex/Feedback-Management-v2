#!/bin/bash

# Start the Flask app in the background
python main.py &
flask_pid=$!

# Give Flask a moment to start
sleep 2

# Seed the database
python seed.py

# Start the localhost.run tunnel and capture the URL
echo "Starting localhost.run tunnel..."
# We use a temp file to capture the output of the SSH command
ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 nokey@localhost.run > tunnel.log 2>&1 &
ssh_pid=$!

# Wait for the URL to appear in the log (up to 30 seconds)
echo "Waiting for tunnel URL..."
for i in {1..30}; do
    TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.lhr\.life|https://[a-zA-Z0-9.-]+\.localhost\.run|https://[a-zA-Z0-9.-]+\.lhr\.pro" tunnel.log | grep -v "admin" | head -n 1)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
    echo "Could not capture tunnel URL after 30s. Check tunnel.log."
    # Fallback to local for dev
    TUNNEL_URL="http://localhost:8080"
fi

echo "Public URL: $TUNNEL_URL?key=$EVENT_KEY"
echo "$TUNNEL_URL?key=$EVENT_KEY" > app/static/tunnel_url.txt

# Generate QR code (using a simple python script)
python -c "import qrcode, os; img = qrcode.make('$TUNNEL_URL?key=' + os.getenv('EVENT_KEY', '')); img.save('app/static/qr.png')"

# Keep the script running
wait $flask_pid
