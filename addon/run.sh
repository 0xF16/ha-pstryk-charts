#!/bin/bash

CONFIG_PATH=/data/options.json

HA_URL=$(jq --raw-output '.ha_url' $CONFIG_PATH)
HA_TOKEN=$(jq --raw-output '.ha_token' $CONFIG_PATH)
CHEAP=$(jq --raw-output '.cheap_threshold' $CONFIG_PATH)
EXPENSIVE=$(jq --raw-output '.expensive_threshold' $CONFIG_PATH)
REFRESH_MIN=$(jq --raw-output '.refresh_minute' $CONFIG_PATH)

# Create a temporary config.json for the python script
echo "{\"HA_URL\": \"$HA_URL\", \"HA_TOKEN\": \"$HA_TOKEN\", \"CHEAP_THRESHOLD\": $CHEAP, \"EXPENSIVE_THRESHOLD\": $EXPENSIVE}" > /app/config.json

function generate_dashboard() {
    echo "Generating dashboard..."
    cd /app && python3 /app/pstryk_chart.py
    
    # Publicly serve as JPG
    mkdir -p /config/www/pstryk_charts
    cp /app/pstryk_dashboard.jpg /config/www/pstryk_charts/dashboard.jpg
    cp /app/pstryk_dashboard.pdf /config/www/pstryk_charts/dashboard.pdf
    
    # Backup to share
    mkdir -p /share/pstryk_charts
    cp /app/pstryk_dashboard.jpg /share/pstryk_charts/
    echo "Dashboard updated at $(date)"
}

echo "Performing initial generation on startup..."
generate_dashboard

echo "Add-on started. Will refresh every hour at minute $REFRESH_MIN."

while true; do
    CURRENT_MIN=$(date +%-M)
    if [ "$CURRENT_MIN" -eq "$REFRESH_MIN" ]; then
        echo "Target minute reached ($REFRESH_MIN)."
        generate_dashboard
        echo "Sleeping for 70s to move to next minute..."
        sleep 70
    fi
    sleep 20
done
