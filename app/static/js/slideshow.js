/*
 * ═══════════════════════════════════════════════════════
 *  CHART COLOR PALETTE — Easy to update!
 *  These colors are cycled across bars in every bar/ranking
 *  chart so each option gets its own distinct color.
 *  Add, remove, or swap hex values freely.
 *  Must be kept in sync with charts.js.
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

function getBarColors(count) {
    return Array.from({ length: count }, (_, i) => CHART_COLORS[i % CHART_COLORS.length]);
}

// ─── State ───────────────────────────────────────────────────────────────────
let pollCharts = {};      // { questionId: Chart instance }
let allResults = [];      // latest /results payload
let currentPage = 0;      // which slide-page is showing
let slideTimer = null;

const SLIDE_INTERVAL_MS = 10000; // 10 seconds per slide
const CHARTS_PER_PAGE = 2;

// ─── Entry point ─────────────────────────────────────────────────────────────
async function updateCharts() {
    const res = await fetch('/results');
    allResults = await res.json();
    buildCarousel();
}

// ─── Build / rebuild the carousel from scratch ───────────────────────────────
function buildCarousel() {
    const track = document.getElementById('carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');
    const viewport = document.getElementById('carousel-viewport');

    // Split results into pages of CHARTS_PER_PAGE
    const pages = [];
    for (let i = 0; i < allResults.length; i += CHARTS_PER_PAGE) {
        pages.push(allResults.slice(i, i + CHARTS_PER_PAGE));
    }
    if (pages.length === 0) return;

    // Determine if we need to loop: wrap the last slide back to first
    // We do a real carousel: pages + [clone of page 0] so the slide-left
    // feels seamless when wrapping.
    const totalPages = pages.length;

    // Measure the viewport width — each page gets exactly this width
    const pageWidth = viewport.offsetWidth;

    // ── Build or sync DOM pages ──────────────────────────────────────────────
    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    pages.forEach((pageData, pageIndex) => {
        const page = document.createElement('div');
        page.className = 'carousel-page';
        page.style.width = pageWidth + 'px';
        page.dataset.pageIndex = pageIndex;

        pageData.forEach(q => {
            const card = buildCard(q);
            page.appendChild(card);
        });

        track.appendChild(page);

        // Dot
        const dot = document.createElement('div');
        dot.className = 'carousel-dot' + (pageIndex === currentPage ? ' active' : '');
        dot.dataset.page = pageIndex;
        dot.addEventListener('click', () => goToPage(pageIndex));
        dotsContainer.appendChild(dot);
    });

    // Set track total width
    track.style.width = (pageWidth * totalPages) + 'px';

    // Jump immediately to currentPage (no animation on build)
    track.style.transition = 'none';
    applyTranslate(currentPage, pageWidth);
    // Re-enable transitions on next frame
    requestAnimationFrame(() => {
        track.style.transition = 'transform 0.7s cubic-bezier(0.77, 0, 0.18, 1)';
    });

    // Render charts into newly created cards
    allResults.forEach(q => renderChart(q));

    // Re-render word clouds for the active page (they need visible dimensions)
    requestAnimationFrame(() => renderWordCloudsOnPage(currentPage));

    // Start / restart the auto-advance timer
    startTimer(totalPages);
}

// ─── Slide to a specific page ────────────────────────────────────────────────
function goToPage(index) {
    const track = document.getElementById('carousel-track');
    const viewport = document.getElementById('carousel-viewport');
    const pageWidth = viewport.offsetWidth;
    const totalPages = document.querySelectorAll('.carousel-page').length;

    currentPage = ((index % totalPages) + totalPages) % totalPages;
    applyTranslate(currentPage, pageWidth);
    updateDots(currentPage);

    // Re-render word clouds on the newly visible page since they need dims
    setTimeout(() => renderWordCloudsOnPage(currentPage), 750);
}

function applyTranslate(page, pageWidth) {
    const track = document.getElementById('carousel-track');
    if (track) {
        track.style.transform = `translateX(-${page * pageWidth}px)`;
    }
}

function updateDots(activeIndex) {
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
    });
}

// ─── Auto-advance timer ──────────────────────────────────────────────────────
function startTimer(totalPages) {
    if (slideTimer) clearInterval(slideTimer);
    if (totalPages <= 1) return;
    slideTimer = setInterval(() => {
        goToPage(currentPage + 1);
    }, SLIDE_INTERVAL_MS);
}

// ─── Chart builders ──────────────────────────────────────────────────────────

/**
 * Creates a card element for a question. Does NOT render the chart yet.
 * Rendering is done separately so we can render after the element is in the DOM.
 */
function buildCard(q) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.questionId = q.id;
    card.dataset.questionType = q.type;

    if (q.type === 'single_select' || q.type === 'multi_select') {
        card.innerHTML = `<h3>${q.title}</h3><div style="flex:1;min-height:0;position:relative;"><canvas id="chart-${q.id}"></canvas></div>`;
    } else if (q.type === 'ranking') {
        card.innerHTML = `<h3>${q.title}</h3><p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">Ranked Preference Score (Higher is better)</p><div style="flex:1;min-height:0;position:relative;"><canvas id="chart-${q.id}"></canvas></div>`;
    } else if (q.type === 'word_cloud') {
        card.innerHTML = `<h3>${q.title}</h3><div style="flex:1;min-height:0;position:relative;"><canvas id="cloud-${q.id}" style="width:100%;height:100%;"></canvas></div>`;
    } else if (q.type === 'short_text') {
        card.innerHTML = `<h3>${q.title}</h3><div id="ideas-${q.id}" class="ideas-list"></div><div id="ideas-more-${q.id}" class="more-indicator"></div>`;
    }

    return card;
}

/** After cards are in the DOM, call this to render/update the chart data. */
function renderChart(q) {
    if (q.type === 'single_select' || q.type === 'multi_select') {
        renderPollChart(q);
    } else if (q.type === 'ranking') {
        renderRankingChart(q);
    } else if (q.type === 'short_text') {
        renderIdeas(q);
    }
    // Word clouds are deferred to renderWordCloudsOnPage() since they need visible sizing
}

/** Word clouds must be rendered while their canvas is visible and sized. */
function renderWordCloudsOnPage(pageIndex) {
    const pages = document.querySelectorAll('.carousel-page');
    const page = pages[pageIndex];
    if (!page) return;

    page.querySelectorAll('[data-question-type="word_cloud"]').forEach(card => {
        const qId = card.dataset.questionId;
        const q = allResults.find(r => String(r.id) === qId);
        if (q) renderWordCloud(q, card);
    });
}

// ─── Individual render functions ─────────────────────────────────────────────

function renderPollChart(q) {
    const canvas = document.getElementById(`chart-${q.id}`);
    if (!canvas) return;

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
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    y: { grid: { display: false }, ticks: { color: TICK_COLOR, font: { size: 14, weight: 'bold' } } },
                    x: { beginAtZero: true, grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { weight: 'bold' } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

function renderRankingChart(q) {
    const canvas = document.getElementById(`chart-${q.id}`);
    if (!canvas) return;

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
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true, grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { weight: 'bold' } } },
                    y: { grid: { display: false }, ticks: { color: TICK_COLOR, font: { size: 14, weight: 'bold' } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

function renderWordCloud(q, card) {
    const canvas = document.getElementById(`cloud-${q.id}`);
    if (!canvas || !q.data || q.data.length === 0) return;

    const container = canvas.parentElement;
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Only render if actual dimensions are available
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;

    const maxFreq = Math.max(...q.data.map(d => d[1]));

    WordCloud(canvas, {
        list: q.data,
        gridSize: Math.round(w / 40),
        weightFactor: size => (size / maxFreq) * Math.min(w, h) * 0.15,
        fontFamily: 'Inter, sans-serif',
        color: () => CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)],
        rotateRatio: 0.4,
        rotationSteps: 2,
        backgroundColor: WORDCLOUD_BG
    });
}

function renderIdeas(q) {
    const list = document.getElementById(`ideas-${q.id}`);
    const moreIndicator = document.getElementById(`ideas-more-${q.id}`);
    if (!list) return;

    list.innerHTML = q.data.map(idea => `
        <div
            title="${idea.text.replace(/"/g, '&quot;')}"
            style="
                background: var(--idea-bubble-bg);
                padding: 12px;
                margin-bottom: 8px;
                border-radius: 8px;
                border: 1px solid var(--border);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                cursor: default;
            "
        >${idea.text}</div>
    `).join('');

    if (moreIndicator) {
        moreIndicator.innerText = q.total > 10 ? `+${q.total - 10} more ideas submitted` : '';
    }
}

// ─── Tunnel URL ───────────────────────────────────────────────────────────────
async function updateTunnelUrl() {
    try {
        const res = await fetch('/static/tunnel_url.txt');
        if (res.ok) {
            const url = await res.text();
            const el = document.getElementById('tunnel-url');
            if (el) el.innerText = url.trim();
        }
    } catch (e) {
        // Not available locally
    }
}

// ─── Handle window resize ────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    // Recalculate page widths without animation
    const track = document.getElementById('carousel-track');
    const viewport = document.getElementById('carousel-viewport');
    const pages = document.querySelectorAll('.carousel-page');
    const pageWidth = viewport.offsetWidth;

    pages.forEach(page => { page.style.width = pageWidth + 'px'; });
    track.style.width = (pageWidth * pages.length) + 'px';

    track.style.transition = 'none';
    applyTranslate(currentPage, pageWidth);
    requestAnimationFrame(() => {
        track.style.transition = 'transform 0.7s cubic-bezier(0.77, 0, 0.18, 1)';
    });
});

// ─── Init ─────────────────────────────────────────────────────────────────────
window.updateCharts = updateCharts;
// Wait for full page load so the carousel viewport has real pixel dimensions
window.addEventListener('load', () => {
    updateCharts();
    updateTunnelUrl();
    setInterval(updateTunnelUrl, 30000);
});
