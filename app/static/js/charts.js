/*
 * ═══════════════════════════════════════════════════════
 *  CHART COLOR PALETTE — Easy to update!
 *  These colors are cycled across bars in every bar/ranking
 *  chart so each option gets its own distinct color.
 *  Add, remove, or swap hex values freely.
 *  Tip: keep colors vivid — they need to pop on the display.
 * ═══════════════════════════════════════════════════════
 */
const CHART_COLORS = [
    '#1b7f74',  // Teal green    (matches --primary)
    '#e07b39',  // Burnt orange  (matches --accent)
    '#7c5cbf',  // Soft purple
    '#d4473a',  // Warm red
    '#2e9e5b',  // Forest green
    '#d4a017',  // Golden yellow
];

/* Word cloud background — should match --card-bg from CSS */
const WORDCLOUD_BG = '#ffffff';

/* Axis tick color — should be readable on --card-bg */
const TICK_COLOR = '#1a1a2e';

/* Axis grid line color */
const GRID_COLOR = '#d6cfc4';

// ─────────────────────────────────────────────────────────────────────────────

let pollCharts = {};

async function updateCharts() {
    const res = await fetch('/results');
    const data = await res.json();
    const container = document.getElementById('charts');

    data.forEach(q => {
        if (q.type === 'single_select' || q.type === 'multi_select') {
            renderPollChart(q, container);
        } else if (q.type === 'short_text') {
            renderIdeas(q, container);
        } else if (q.type === 'word_cloud') {
            renderWordCloud(q, container);
        } else if (q.type === 'ranking') {
            renderRankingChart(q, container);
        }
    });
}

function getBarColors(count) {
    // Returns an array of colors cycling through CHART_COLORS
    return Array.from({ length: count }, (_, i) => CHART_COLORS[i % CHART_COLORS.length]);
}

function renderRankingChart(q, container) {
    let canvas = document.getElementById(`chart-${q.id}`);
    if (!canvas) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${q.title}</h3><p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px;">Ranked Preference Score (Higher is better)</p><canvas id="chart-${q.id}"></canvas>`;
        container.appendChild(card);
        canvas = document.getElementById(`chart-${q.id}`);
    }

    const labels = q.data.map(d => d[0]);
    const values = q.data.map(d => d[1]);
    const colors = getBarColors(labels.length);

    if (pollCharts[q.id]) {
        pollCharts[q.id].data.labels = labels;
        pollCharts[q.id].data.datasets[0].data = values;
        pollCharts[q.id].data.datasets[0].backgroundColor = colors;
        pollCharts[q.id].update();
    } else {
        pollCharts[q.id] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Score',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: GRID_COLOR },
                        ticks: { color: TICK_COLOR, font: { weight: 'bold' } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: TICK_COLOR, font: { size: 14, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

function renderWordCloud(q, container) {
    let canvas = document.getElementById(`cloud-${q.id}`);
    if (!canvas) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${q.title}</h3><div style="width:100%; height:450px;"><canvas id="cloud-${q.id}" style="width:100%; height:100%;"></canvas></div>`;
        container.appendChild(card);
        canvas = document.getElementById(`cloud-${q.id}`);
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }

    if (q.data && q.data.length > 0) {
        const maxFreq = Math.max(...q.data.map(d => d[1]));
        WordCloud(canvas, {
            list: q.data,
            gridSize: 16,
            weightFactor: size => (size * 50) / maxFreq,
            fontFamily: 'Inter, sans-serif',
            color: () => CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)],
            rotateRatio: 0.5,
            rotationSteps: 2,
            backgroundColor: WORDCLOUD_BG
        });
    }
}

function renderPollChart(q, container) {
    let canvas = document.getElementById(`chart-${q.id}`);
    if (!canvas) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${q.title}</h3><canvas id="chart-${q.id}"></canvas>`;
        container.appendChild(card);
        canvas = document.getElementById(`chart-${q.id}`);
    }

    const labels = Object.keys(q.data);
    const values = Object.values(q.data);
    const colors = getBarColors(labels.length);

    if (pollCharts[q.id]) {
        pollCharts[q.id].data.labels = labels;
        pollCharts[q.id].data.datasets[0].data = values;
        pollCharts[q.id].data.datasets[0].backgroundColor = colors;
        pollCharts[q.id].update();
    } else {
        pollCharts[q.id] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Votes',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    y: {
                        grid: { display: false },
                        ticks: { color: TICK_COLOR, font: { size: 12, weight: 'bold' } }
                    },
                    x: {
                        beginAtZero: true,
                        grid: { color: GRID_COLOR },
                        ticks: { color: TICK_COLOR, font: { weight: 'bold' } }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

function renderIdeas(q, container) {
    let list = document.getElementById(`ideas-${q.id}`);
    if (!list) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${q.title}</h3><div id="ideas-${q.id}" class="ideas-list"></div><div id="ideas-more-${q.id}" class="more-indicator"></div>`;
        container.appendChild(card);
        list = document.getElementById(`ideas-${q.id}`);
    }

    list.innerHTML = q.data.map(idea => `
        <div
            title="${idea.text.replace(/"/g, '&quot;')}"
            style="
                background: var(--idea-bubble-bg);
                padding: 12px;
                margin-bottom: 8px;
                border-radius: 8px;
                border: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                cursor: default;
            "
        >
            <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${idea.text}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${idea.votes_up > 0 ? `<span style="background: var(--success); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">↑${idea.votes_up}</span>` : ''}
                ${idea.votes_down > 0 ? `<span style="background: var(--danger); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">↓${idea.votes_down}</span>` : ''}
            </div>
        </div>
    `).join('');

    const moreIndicator = document.getElementById(`ideas-more-${q.id}`);
    if (q.total > 10) {
        moreIndicator.innerText = `+${q.total - 10} more ideas submitted`;
    } else {
        moreIndicator.innerText = '';
    }
}

async function updateTunnelUrl() {
    try {
        const res = await fetch('/static/tunnel_url.txt');
        if (res.ok) {
            const url = await res.text();
            document.getElementById('tunnel-url').innerText = url.trim();
        }
    } catch (e) {
        console.log("Tunnel URL file not found yet.");
    }
}

window.updateCharts = updateCharts;
updateCharts();
updateTunnelUrl();
setInterval(updateTunnelUrl, 30000);
