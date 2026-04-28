import json
import requests
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from datetime import datetime
import os

# --- CONFIGURATION ---
CONFIG_FILE = 'config.json'
DEFAULT_HA_URL = "http://homeassistant.local:8123"
DEFAULT_HA_TOKEN = ""

# Colors optimized for Light Theme / Color E-ink (High Contrast, Flat)
COLORS = {
    'bg': '#FFFFFF',
    'card_bg': '#FFFFFF',
    'text': '#000000',
    'cheap': '#2ECC71',      # Stronger Green
    'expensive': '#E74C3C',  # Stronger Red
    'normal': '#3498DB',     # Stronger Blue
    'grid': '#DDDDDD'
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {"HA_URL": DEFAULT_HA_URL, "HA_TOKEN": DEFAULT_HA_TOKEN}

def fetch_ha_entity(config, entity_id):
    url = f"{config.get('HA_URL')}/api/states/{entity_id}"
    headers = {
        "Authorization": f"Bearer {config.get('HA_TOKEN')}",
        "Content-Type": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching {entity_id}: {e}")
    return None

def get_mock_data():
    prices_today = [{"time": f"2026-04-27T{h:02d}:00:00+02:00", "price": 0.5 + (h % 5) * 0.2} for h in range(24)]
    prices_tomorrow = [{"time": f"2026-04-28T{h:02d}:00:00+02:00", "price": 0.4 + (h % 7) * 0.15} for h in range(24)]
    expensive_hours = ["2026-04-27T19:00:00+02:00", "2026-04-27T20:00:00+02:00", "2026-04-28T19:00:00+02:00"]
    cheap_hours = ["2026-04-27T13:00:00+02:00", "2026-04-27T14:00:00+02:00", "2026-04-28T13:00:00+02:00"]
    return prices_today, prices_tomorrow, expensive_hours, cheap_hours

def render_axis(ax, prices, title, thresholds, is_today=True):
    labels = [datetime.fromisoformat(p['time']).strftime('%H') for p in prices]
    values = [p['price'] for p in prices]
    
    colors = []
    for p in prices:
        price = p['price']
        if thresholds.get('cheap') is not None and price <= thresholds['cheap']:
            colors.append(COLORS['cheap'])
        elif thresholds.get('expensive') is not None and price >= thresholds['expensive']:
            colors.append(COLORS['expensive'])
        else:
            colors.append(COLORS['normal'])

    ax.set_facecolor(COLORS['card_bg'])
    bars = ax.bar(labels, values, color=colors, edgecolor='none', width=0.8, zorder=3)
    
    # Title
    ax.text(0.02, 0.95, title, transform=ax.transAxes, color=COLORS['text'], 
            fontsize=12, fontweight='bold', va='top')

    # Price labels above bars
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width()/2, val, f"{val:.2f}", 
                ha='center', va='bottom', fontsize=7, color=COLORS['text'], fontweight='bold')

    # X-axis ticks (Vertical)
    ax.tick_params(axis='x', colors=COLORS['text'], labelsize=8, rotation=90)
    ax.tick_params(axis='y', colors=COLORS['text'], labelsize=8)

    # Clean up spines
    for spine in ['top', 'right']:
        ax.spines[spine].set_visible(False)
    for spine in ['left', 'bottom']:
        ax.spines[spine].set_color('#000000')
        ax.spines[spine].set_linewidth(1.5)

    # Grid (Horizontal lines for readability)
    ax.yaxis.grid(True, linestyle='-', color=COLORS['grid'], alpha=0.8, zorder=0, linewidth=0.5)
    ax.set_axisbelow(True) # Ensure grid is behind bars

    # Current hour highlight
    if is_today:
        now = datetime.now()
        current_hour_str = now.strftime('%H')
        if current_hour_str in labels:
            idx = labels.index(current_hour_str)
            rect = patches.Rectangle((idx - 0.4, 0), 0.8, max(values) * 1.1, 
                                     linewidth=2, edgecolor='black', facecolor='#000000', alpha=0.1, zorder=4)
            ax.add_patch(rect)

def create_dashboard(today_prices, tomorrow_prices, thresholds):
    # Figure size for 800x480 at 100 DPI
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 4.8), dpi=100, facecolor=COLORS['bg'])
    
    plt.subplots_adjust(hspace=0.4, left=0.08, right=0.98, top=0.92, bottom=0.12)

    render_axis(ax1, today_prices, "DZISIAJ (PLN/kWh)", thresholds, is_today=True)
    
    if tomorrow_prices:
        render_axis(ax2, tomorrow_prices, "JUTRO (PLN/kWh)", thresholds, is_today=False)
    else:
        ax2.set_facecolor(COLORS['card_bg'])
        ax2.text(0.5, 0.5, "BRAK DANYCH NA JUTRO", color='gray', ha='center', va='center', transform=ax2.transAxes)
        ax2.axis('off')

    # Last Updated (More visible footer)
    plt.text(0.98, 0.03, f"Aktualizacja: {datetime.now().strftime('%Y-%m-%d %H:%M')}", 
             color='#555555', fontsize=10, ha='right', va='bottom', transform=fig.transFigure, fontweight='bold')

    # Save
    plt.savefig("pstryk_dashboard.jpg", facecolor=COLORS['bg'])
    plt.savefig("pstryk_dashboard.pdf", facecolor=COLORS['bg'])
    plt.close()
    print("Dashboard generated: pstryk_dashboard.jpg/pdf (800x480)")

def main():
    config = load_config()
    
    # Thresholds from config with defaults
    cheap_val = config.get('CHEAP_THRESHOLD')
    exp_val = config.get('EXPENSIVE_THRESHOLD')
    
    thresholds = {
        'cheap': float(cheap_val) if cheap_val is not None else 0.4,
        'expensive': float(exp_val) if exp_val is not None else 1.2
    }

    # Fetch Data
    price_entity = fetch_ha_entity(config, 'sensor.pstryk_current_buy_price')

    if price_entity:
        prices_today = price_entity['attributes'].get('prices_today', [])
        prices_tomorrow = price_entity['attributes'].get('prices_tomorrow', [])
    else:
        print("Using mock data.")
        prices_today, prices_tomorrow, _, _ = get_mock_data()

    create_dashboard(prices_today, prices_tomorrow, thresholds)

if __name__ == "__main__":
    main()
