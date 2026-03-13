# Feedback Management v2

A dynamic, real-time feedback and polling system built with Flask, SQLAlchemy, Docker, and WebSocket integration. It's designed for live events, civic meetings, and interactive presentations where audiences can provide real-time responses.

## Features

- **Public Kiosk Interface**: Attendees can submit responses via a mobile-friendly web app.
- **Live Display Board**: Real-time visualization of polls, word clouds, and text feedback updates automatically.
- **Admin Dashboard**: Event organizers can manage questions, monitor incoming responses, and control what is displayed.
- **Auto-generated Public URL**: The system automatically generates a secure public tunnel URL via `localhost.run` and builds a QR code for your event.
- **Profanity Filtering**: Automatic server-side filtering of inappropriate text feedback.

---

## 🚀 Quick Start / Setup

### 1. Setup the `.env` file

Before running the application, you need to configure your environment variables. Create a file named `.env` in the root of the project directory with the following structure:

```env
EVENT_NAME=Your Custom Event Name
EVENT_KEY=your-secret-invite-key
ADMIN_PASSWORD=your-secure-admin-password
SECRET_KEY=your-random-flask-secret
```

> [!WARNING]
> Do **not** wrap values in quotes in this file. Docker Compose reads the `.env` literally, so `EVENT_KEY="CIVIC2026"` would set the key to `"CIVIC2026"` (with the quote characters), causing 403 errors on submission.

**Variable Breakdown:**

- `EVENT_NAME`: The title displayed on the public submission page and the live display board (defaults to "Civic Feedback Event").
- `EVENT_KEY`: A required string appended to the URL (e.g., `/?key=your-secret-invite-key`) to authorize users to submit feedback. Used for QR code generation.
- `ADMIN_PASSWORD`: A required password to access the `/admin` dashboard.
- `SECRET_KEY`: Used by Flask to securely encrypt session data. Should be a random string.

### 2. Start with Docker

The easiest way to run the application is using Docker Compose. Ensure Docker is installed and running on your machine.

Open your terminal, navigate to the project directory, and run:

```bash
docker compose up -d
```

This will:

1. Build the Python/Flask environment.
2. Seed the SQLite database (`data/feedback.db`) with initial data.
3. Automatically provision a public tunnel URL and save it to `app/static/tunnel_url.txt`.
4. Generate a QR code for your event at `app/static/qr.png`.

To view the live logs (optional but helpful for grabbing the live URL), run:

```bash
docker compose logs -f
```

---

## 📱 Device & Page Routing

Once the application is running, you can access the following pages on your devices.

_(Note: If you are connecting from the same machine or local network, you can use `http://localhost:8080`. For external devices over the internet, look for the generated `.lhr.life` or `.localhost.run` link printed in your Docker logs or found in `app/static/tunnel_url.txt`)_

### 1. The Audience Device (Public Kiosk)

- **URL**: `http://localhost:8080/?key=YOUR_EVENT_KEY` (or the generic public tunnel URL with your key appended)
- **Purpose**: This is the mobile-friendly page where event attendees submit their feedback. You should print or display the automatically generated QR code (`app/static/qr.png`) for users to scan with their phones.

### 2. The Main Screen (Live Display Board)

- **URL**: `http://localhost:8080/display`
- **Purpose**: This page should be opened on the main projector or large monitor at your event. It visualizes the incoming data in real-time, displaying bar charts, word clouds, and safe text responses as they are submitted.

### 3. The Organizer Device (Admin Dashboard)

- **URL**: `http://localhost:8080/admin`
- **Purpose**: Open this on your personal laptop or tablet. You will be prompted to enter your `ADMIN_PASSWORD`. Here, you can actively manage questions, toggle which questions are visible to the audience, and monitor overall engagement.

---

## Stopping the Application

To safely stop the application and background processes, run:

```bash
docker compose down
```

If you wish to clear all database volumes and start entirely from scratch next time (this deletes all feedback data):

```bash
docker compose down -v
```
