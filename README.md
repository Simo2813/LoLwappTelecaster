# LoL WhatsApp Announcer 🎙️🤖

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/Simo2813/LoLwappTelecaster)](https://github.com/Simo2813/LoLwappTelecaster/commits/main)
[![Repo Size](https://img.shields.io/github/repo-size/Simo2813/LoLwappTelecaster)](https://github.com/Simo2813/LoLwappTelecaster)

Welcome to the LoL WhatsApp Announcer, an automated system that turns your friend group's League of Legends matches into an epic, AI-powered sports commentary on WhatsApp!

This project uses a Python tracker to analyze game data from Riot Games' API and a Node.js bot powered by Google Gemini to generate unique, humorous, and dramatic commentary on LP losses, leaderboard overtakes, and weekly performance summaries.

---

## ✨ Features

-   **AI-Generated Commentary**: Every notification is uniquely crafted by Google Gemini, ensuring fresh and entertaining content.
-   **Real-time LP Loss Notifications**: Get sarcastic and creative taunts when a player on the watchlist loses LP. Multiple commentary styles available (Cursed Poet, Sarcastic Sports Caster, etc.).
-   **Leaderboard Overtake Alerts**: Special announcements when one player surpasses another, distinguishing between "active" overtakes (climbing) and "passive" undertakess (when someone else falls down the ladder).
-   **"Holly & Benji" Style Weekly Wrap-up**: Every week, the bot delivers an over-the-top news bulletin summarizing the highlights—a true saga of triumphs and tragedies.
-   **Highly Configurable**: Easily configure which players to track, which events trigger notifications, and more through simple `.yaml` and `.env` files.
-   **Modular & Robust Architecture**: A Python data-cruncher and a Node.js announcer communicate through a reliable file-based event system, designed to run 24/7 on a server.

---

## 🚀 System Architecture

The project is composed of two independent microservices:

1.  **The Rank Tracker (Python)**: A standalone script that runs periodically via cron job. It fetches player data from the Riot API, stores historical rank data in an SQLite database, and detects game-related events. When an event is detected, it writes a small file (`.txt` or `.json`) into an `events` directory.
2.  **The Announcer Bot (Node.js)**: A long-running process managed by `pm2`. It uses `chokidar` to watch the `events` directory. When a new event file appears, the bot reads it, determines the context, constructs a detailed prompt, and queries the Google Gemini API to generate a creative commentary. The final message is then sent to a configured WhatsApp group.

This decoupled architecture ensures that data collection and notification delivery are separate processes, improving stability and scalability.

---

## 🛠️ Setup and Installation

### Prerequisites

-   A **Linux Server** (tested on Ubuntu 22.04). A headless environment is recommended.
-   Python 3.8+
-   Node.js v18+
-   A **Riot Games** API Key (from [developer.riotgames.com](https://developer.riotgames.com/))
-   A **Google Gemini** API Key (from [aistudio.google.com](https://aistudio.google.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/Simo2813/LoLwappTelecaster.git
cd LoLwappTelecaster
```

### 2. Setup the Rank Tracker (Python Service)

This script tracks game data and creates event files.

```bash
# 1. Navigate to the Python service directory
cd python_tracker

# 2. Install Python dependencies
pip install pyyaml requests

# 3. Configure players and API key
cp config.yaml.example config.yaml
nano config.yaml # Edit the file with your Riot API key and player PUUIDs
```

### 3. Setup the Announcer Bot (Node.js Service)

This bot reads the events and sends messages to WhatsApp.

**Step 3.1: Install System Dependencies for Puppeteer**

The bot uses Puppeteer (which controls a headless Chrome browser) to connect to WhatsApp. It requires several system libraries to run on a headless server.

On Debian/Ubuntu, run the following command to install them:
```bash
sudo apt-get update && sudo apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

**Step 3.2: Install Node.js Dependencies and Configure**

```bash
# 1. Navigate to the bot's directory
cd ../nodejs_bot

# 2. Install Node.js dependencies
npm install

# 3. Configure API keys and Group ID
cp .env.example .env
nano .env # Edit the file with your Gemini API key, WhatsApp Group ID, etc.
```

### 4. Launch and Automation

#### Launching the Announcer Bot

We recommend using the process manager `pm2` to keep the bot running 24/7.

```bash
# From the nodejs_bot directory
npm install -g pm2 # Install pm2 globally if you haven't already
pm2 start bot.js --name "lol-announcer"
```
The first time you run it, you will need to scan the QR code that appears in the terminal. Use `pm2 logs lol-announcer` to view the logs and the QR code.

#### Automating the Rank Tracker (Cron Job)

Set up two cron jobs to run the Python script automatically.

```bash
crontab -e
```

Add the following lines, making sure to **use the absolute paths** for your project directory.
```crontab
# Run the normal rank check every 15 minutes
*/15 * * * * /usr/bin/python3 /path/to/LoLwappTelecaster/python_tracker/rank_tracker.py > /dev/null 2>&1

# Run the weekly summary every Sunday at 19:00 (7 PM)
0 19 * * 7 /usr/bin/python3 /path/to/LoLwappTelecaster/python_tracker/rank_tracker.py --weekly-summary > /dev/null 2>&1
```
*(Note: `> /dev/null 2>&1` prevents cron from sending emails for every execution, as the script already handles its own logging).*

---

## 🤝 Contributing

This is a for-fun project, but contributions are welcome! If you have ideas for new event types, better prompts for the AI, or code improvements, feel free to open a Pull Request or an Issue.

## 📜 License

This project is released under the MIT License. See the `LICENSE` file for more details.