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

    if (pollCharts[q.id]) {
        pollCharts[q.id].data.labels = labels;
        pollCharts[q.id].data.datasets[0].data = values;
        pollCharts[q.id].update();
    } else {
        pollCharts[q.id] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score',
                    data: values,
                    backgroundColor: '#005f86', // Baltic Blue
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: '#334155' },
                        ticks: { color: '#f8fafc', font: { weight: 'bold' } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#f8fafc', font: { size: 14, weight: 'bold' } }
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
        card.innerHTML = `<h3>${q.title}</h3><div style="width:100%; height:300px;"><canvas id="cloud-${q.id}" style="width:100%; height:100%;"></canvas></div>`;
        container.appendChild(card);
        canvas = document.getElementById(`cloud-${q.id}`);
        // Make canvas resolution match its display size
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }

    if (q.data && q.data.length > 0) {
        WordCloud(canvas, {
            list: q.data,
            gridSize: 16,
            weightFactor: function (size) {
                return (size * 20) / Math.max(...q.data.map(d => d[1]));
            },
            fontFamily: 'Inter, sans-serif',
            color: 'random-light',
            rotateRatio: 0.5,
            rotationSteps: 2,
            backgroundColor: '#1e293b'
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

    if (pollCharts[q.id]) {
        pollCharts[q.id].data.labels = labels;
        pollCharts[q.id].data.datasets[0].data = values;
        pollCharts[q.id].update();
    } else {
        pollCharts[q.id] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votes',
                    data: values,
                    backgroundColor: '#005f86', // Baltic Blue
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#334155' },
                        ticks: { color: '#f8fafc', font: { weight: 'bold' } }
                    },
                    x: {
                        ticks: { color: '#f8fafc', font: { size: 12, weight: 'bold' } }
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
        <div style="background:#334155; padding:12px; margin-bottom:8px; border-radius:8px;">
            ${idea.text}
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
setInterval(updateTunnelUrl, 30000); // Check every 30s in case tunnel restarts
