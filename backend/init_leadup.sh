#!/bin/bash
set -e

echo "[LeadUp] Initializing database and loading demo data..."

# Wait for the app/database to be ready
sleep 5

# Create initial demo users
python3 create_users.py

# Load demo leads
python3 seed_test_leads.py

echo "[LeadUp] Initialization complete."
