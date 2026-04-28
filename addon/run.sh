#!/bin/bash

CONFIG_PATH=/data/options.json

HA_URL=$(jq --raw-output '.ha_url' $CONFIG_PATH)
HA_TOKEN=$(jq --raw-output '.ha_token' $CONFIG_PATH)
INTERVAL=$(jq --raw-output '.update_interval' $CONFIG_PATH)
CHEAP=$(jq --raw-output '.cheap_threshold' $CONFIG_PATH)
EXPENSIVE=$(jq --raw-output '.expensive_threshold' $CONFIG_PATH)

# Create a temporary config.json for the python script
echo "{\"HA_URL\": \"$HA_URL\", \"HA_TOKEN\": \"$HA_TOKEN\", \"CHEAP_THRESHOLD\": $CHEAP, \"EXPENSIVE_THRESHOLD\": $EXPENSIVE}" > /app/config.json

while true; do
    echo "Generating dashboard..."
    cd /app && python3 /app/pstryk_chart.py
    
    # Publicly serve as JPG (accessible via http://ha-ip:8123/local/pstryk_charts/dashboard.jpg)
    mkdir -p /config/www/pstryk_charts
    cp /app/pstryk_dashboard.jpg /config/www/pstryk_charts/dashboard.jpg
    cp /app/pstryk_dashboard.pdf /config/www/pstryk_charts/dashboard.pdf
    
    # Also keep in share for backup
    mkdir -p /share/pstryk_charts
    cp /app/pstryk_dashboard.jpg /share/pstryk_charts/
    
    echo "Dashboard updated. Sleeping for $INTERVAL seconds..."
    sleep "$INTERVAL"
done
