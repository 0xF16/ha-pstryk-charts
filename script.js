// --- CONFIGURATION ---
let config = {
    HA_URL: window.location.origin,
    HA_TOKEN: ""
};

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        if (response.ok) {
            const externalConfig = await response.json();
            config = { ...config, ...externalConfig };
            console.log("Configuration loaded successfully");
        } else {
            console.warn("config.json not found, using defaults/mock data");
        }
    } catch (e) {
        console.warn("Error loading config.json, using defaults/mock data:", e);
    }
}

async function fetchHAEntity(entityId) {
    if (!config.HA_TOKEN || config.HA_TOKEN === "YOUR_LONG_LIVED_ACCESS_TOKEN") {
        console.warn(`HA Token not set, using mock data for ${entityId}`);
        return null;
    }
    try {
        const response = await fetch(`${config.HA_URL}/api/states/${entityId}`, {
            headers: {
                "Authorization": `Bearer ${config.HA_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`Failed to fetch ${entityId}: ${response.statusText}`);
        }
    } catch (e) {
        console.error(`Error fetching HA entity ${entityId}:`, e);
    }
    return null;
}

// Create a 45-degree striped pattern for the current hour background
function createStripedPattern() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 16;
    patternCanvas.height = 16;
    const pctx = patternCanvas.getContext('2d');

    pctx.fillStyle = 'transparent';
    pctx.fillRect(0, 0, 16, 16);

    pctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    pctx.lineWidth = 2;
    pctx.beginPath();

    // Draw 45 degree lines
    pctx.moveTo(0, 16);
    pctx.lineTo(16, 0);

    pctx.moveTo(-8, 8);
    pctx.lineTo(8, -8);

    pctx.moveTo(8, 24);
    pctx.lineTo(24, 8);

    pctx.stroke();

    return pctx.createPattern(patternCanvas, 'repeat');
}

// Utility to map data and determine colors
function processChartData(prices, expensiveHours, cheapHours) {
    const labels = [];
    const data = [];
    const backgroundColors = [];
    const borderColors = [];

    // Helper to check if a time is in the target array
    const isInList = (time, list) => {
        return list.some(item => {
            const itemTime = item.timestamp || item.time;
            return new Date(time).getTime() === new Date(itemTime).getTime();
        });
    };

    prices.forEach(entry => {
        const time = new Date(entry.time);
        const hourStr = time.getHours().toString().padStart(2, '0') + ':00';
        labels.push(hourStr);
        data.push(entry.price);

        let color = '#29b6f6'; // Default normal color
        if (isInList(entry.time, cheapHours)) {
            color = '#00e676'; // Cheap color
        } else if (isInList(entry.time, expensiveHours)) {
            color = '#ff1744'; // Expensive color
        }

        backgroundColors.push(color);
        borderColors.push(color);
    });

    return { labels, data, backgroundColors, borderColors };
}

function createChart(ctxId, dataObj, title, isToday) {
    const ctx = document.getElementById(ctxId).getContext('2d');

    // Determine current hour to highlight
    const now = new Date();
    const currentHourLabel = now.getHours().toString().padStart(2, '0') + ':00';

    // Find the index of the current hour label
    const currentIndex = dataObj.labels.indexOf(currentHourLabel);

    const annotations = {};

    if (isToday && currentIndex !== -1) {
        annotations.currentHour = {
            type: 'box',
            xMin: currentIndex - 0.5,
            xMax: currentIndex + 0.5,
            backgroundColor: createStripedPattern(),
            borderWidth: 0,
            drawTime: 'beforeDatasetsDraw',
            label: {
                display: true,
                content: 'Now',
                position: 'start', // Place at the very top of the chart area
                color: 'rgba(255, 255, 255, 0.8)',
                yAdjust: 15, // Push it down slightly from the absolute top edge
                font: {
                    size: 11,
                    weight: 'bold'
                },
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: { top: 2, bottom: 2, left: 4, right: 4 },
                borderRadius: 4
            }
        };
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dataObj.labels,
            datasets: [{
                label: 'Price (PLN/kWh)',
                data: dataObj.data,
                backgroundColor: dataObj.backgroundColors,
                borderColor: dataObj.borderColors,
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We have custom HTML legend
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y.toFixed(3) + ' PLN';
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9e9e9e',
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9e9e9e',
                        font: {
                            size: 11
                        }
                    }
                }
            },
            animation: false
        }
    });
}

async function initDashboards() {
    await loadConfig();
    let pricesToday = [];
    let pricesTomorrow = [];
    let expensiveHours = [];
    let cheapHours = [];

    // Try fetching from HA
    const priceEntity = await fetchHAEntity('sensor.pstryk_current_buy_price');
    const expEntity = await fetchHAEntity('binary_sensor.pstryk_energy_prices_buy_expensive_hour');
    const cheapEntity = await fetchHAEntity('binary_sensor.pstryk_energy_prices_buy_cheap_hour');

    if (priceEntity && expEntity && cheapEntity) {
        pricesToday = priceEntity.attributes.prices_today || [];
        pricesTomorrow = priceEntity.attributes.prices_tomorrow || [];
        expensiveHours = expEntity.attributes.expensive_hours || [];
        cheapHours = cheapEntity.attributes.cheap_hours || [];
    } else {
        // Fallback to mock data if HA fetch fails or is not configured
        console.log("Using local mock data.");
        pricesToday = mockPriceData.attributes.prices_today || [];
        pricesTomorrow = mockPriceData.attributes.prices_tomorrow || [];
        expensiveHours = mockExpensiveData.attributes.expensive_hours || [];
        cheapHours = mockCheapData.attributes.cheap_hours || [];
    }

    // Process Today Data
    const todayChartData = processChartData(pricesToday, expensiveHours, cheapHours);
    createChart('chart-today', todayChartData, 'Prices Today', true);

    // Process Tomorrow Data
    const tomorrowContainer = document.getElementById('container-tomorrow');
    const tomorrowCanvas = document.getElementById('chart-tomorrow');
    const noDataLabel = document.getElementById('no-data-tomorrow');

    if (pricesTomorrow && pricesTomorrow.length > 0) {
        const tomorrowChartData = processChartData(pricesTomorrow, expensiveHours, cheapHours);
        createChart('chart-tomorrow', tomorrowChartData, 'Prices Tomorrow', false);
    } else {
        // Hide canvas and show no data label
        tomorrowCanvas.classList.add('hidden');
        noDataLabel.classList.remove('hidden');
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', initDashboards);
