#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import yaml
import requests
import json
from datetime import datetime, timezone, timedelta
import logging
from logging.handlers import RotatingFileHandler
import sqlite3
import itertools

# --- 1. CONFIGURATION AND CONSTANTS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.yaml")
OUTPUT_DIR = os.path.join(BASE_DIR, "data")
EVENTS_DIR = os.path.join(BASE_DIR, "events")
LOG_FILE = os.path.join(BASE_DIR, "rank_tracker.log")
DB_FILE = os.path.join(BASE_DIR, "history.db")

TIER_VALUES = {"IRON": 1, "BRONZE": 2, "SILVER": 3, "GOLD": 4, "PLATINUM": 5, "EMERALD": 6, "DIAMOND": 7, "MASTER": 8, "GRANDMASTER": 9, "CHALLENGER": 10}
DIVISION_VALUES = {"IV": 1, "III": 2, "II": 3, "I": 4}

# --- 2. LOGGING SETUP ---
log_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
rotating_handler = RotatingFileHandler(LOG_FILE, maxBytes=1*1024*1024, backupCount=5, encoding='utf-8')
rotating_handler.setFormatter(log_formatter)
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
logging.basicConfig(level=logging.INFO, handlers=[rotating_handler, console_handler])

# --- 3. UTILITY FUNCTIONS ---
def calculate_rank_value(tier, rank, lp):
    """Calculates a numerical ELO value for a given rank."""
    tier_val = TIER_VALUES.get(tier.upper(), 0)
    if tier_val <= 7: division_val = DIVISION_VALUES.get(rank.upper(), 1)
    else: division_val = 4
    return (tier_val - 1)*400 + (division_val - 1)*100 + lp

def load_config():
    """Loads configuration from the config.yaml file."""
    with open(CONFIG_FILE, "r", encoding='utf-8') as f: return yaml.safe_load(f)

# ... (other utility functions like riot_get, get_rank_by_puuid, etc. are unchanged)

# --- 4. DATABASE AND EVENT FUNCTIONS ---
def setup_database():
    """Creates the database table and indexes if they don't exist."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS rank_history (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME NOT NULL, player_tag TEXT NOT NULL, tier TEXT, rank TEXT, lp INTEGER, elo INTEGER, wins INTEGER, losses INTEGER)""")
    cursor.execute("""CREATE INDEX IF NOT EXISTS idx_player_time ON rank_history (player_tag, timestamp DESC)""")
    conn.commit()
    conn.close()

# ... (other DB/Event functions are unchanged)

# --- 5. MAIN LOGIC ---
def check_for_overtakes(current_records, last_records):
    """Compares positions and distinguishes between active and passive overtakes."""
    player_tags = list(current_records.keys())
    if len(player_tags) < 2: return
    logging.info("Checking for overtakes and undertakess...")
    for player_a_tag, player_b_tag in itertools.combinations(player_tags, 2):
        # ... logic is unchanged ...
        pass # Placeholder for brevity

def generate_weekly_summary():
    """Calculates data for the weekly summary and generates the event file."""
    logging.info("--- Starting weekly summary generation ---")
    # ... logic is unchanged ...
    logging.info(f"EVENT: Weekly summary generated successfully! File: {filename}")

def run_normal_check():
    """Runs the periodic rank check."""
    logging.info("=== Starting rank_tracker script (normal check) ===")
    # ... logic is unchanged ...
    logging.info("=== Run finished (normal check) ===")

# --- 6. EXECUTION BLOCK ---
if __name__ == "__main__":
    try:
        setup_database()
        if len(sys.argv) > 1 and sys.argv[1] == '--weekly-summary':
            generate_weekly_summary()
        else:
            run_normal_check()
    except Exception as e:
        logging.exception(f"FATAL: Unhandled error in main execution: {e}")