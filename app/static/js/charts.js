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
    '#005a70',  /* Teal (Primary) */
    '#968f8b',  /* Rosy (Metadata) */
    '#2d3748',  /* Slate */
    '#4a5568',  /* Cool Grey */
    '#1a365d',  /* Navy */
    '#065f46',  /* Forest */
];

/* Match --bg-surface from CSS */
const WORDCLOUD_BG = '#ffffff';

/* Match --text-main and --border-line from CSS */
const TICK_COLOR = '#1a1a1a';
const GRID_COLOR = '#e1e4e8';

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
    return Array.from({ length: count }, (_, i) => CHART_COLORS[i % CHART_COLORS.length]);
}

function renderRankingChart(q, container) {
    let canvas = document.getElementById(`chart-${q.id}`);
    if (!canvas) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3 class="title-font">${q.title}</h3><p style="font-size: 0.8rem; color: var(--rosy); margin-bottom: 1.5rem;">Ranked Preference Score (Higher is better)</p><canvas id="chart-${q.id}"></canvas>`;
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
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: GRID_COLOR },
                        ticks: { color: TICK_COLOR, font: { weight: '600' } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: TICK_COLOR, font: { size: 14, weight: '600' } }
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
        card.innerHTML = `<h3 class="title-font">${q.title}</h3><div style="width:100%; height:450px;"><canvas id="cloud-${q.id}" style="width:100%; height:100%;"></canvas></div>`;
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
        card.innerHTML = `<h3 class="title-font">${q.title}</h3><canvas id="chart-${q.id}"></canvas>`;
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
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    y: {
                        grid: { display: false },
                        ticks: { color: TICK_COLOR, font: { size: 12, weight: '600' } }
                    },
                    x: {
                        beginAtZero: true,
                        grid: { color: GRID_COLOR },
                        ticks: { color: TICK_COLOR, font: { weight: '600' } }
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
        card.innerHTML = `<h3 class="title-font">${q.title}</h3><div id="ideas-${q.id}" class="ideas-list"></div><div id="ideas-more-${q.id}" class="more-indicator" style="font-weight:600; color:var(--teal); margin-top:1rem; text-align:center;"></div>`;
        container.appendChild(card);
        list = document.getElementById(`ideas-${q.id}`);
    }

    list.innerHTML = q.data.map(idea => `
        <div class="idea-bubble" title="${idea.text.replace(/"/g, '&quot;')}">
            <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${idea.text}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${idea.votes_up > 0 ? `
                    <span class="vote-badge vote-up" style="display:flex; align-items:center; gap:4px;">
                        <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:3;" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M12 5L5 12M12 5L19 12"/></svg>
                        ${idea.votes_up}
                    </span>` : ''}
                ${idea.votes_down > 0 ? `
                    <span class="vote-badge vote-down" style="display:flex; align-items:center; gap:4px;">
                        <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:3;" stroke-linecap round stroke-linejoin="round"><path d="M12 5v14M12 19l-7-7M12 19l7-7"/></svg>
                        ${idea.votes_down}
                    </span>` : ''}
            </div>
        </div>
    `).join('');

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
