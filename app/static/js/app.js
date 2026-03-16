let questions = [];
let currentIdx = 0;
const app = document.getElementById('app');
const progressBar = document.getElementById('progress-bar');
const progressWrapper = document.getElementById('progress-wrapper');
const progressText = document.getElementById('progress');

const getEventKey = () => {
    const urlParams = new URLSearchParams(window.location.search);
    let key = urlParams.get('key');
    if (key) {
        // URL key is authoritative — always save and use it
        localStorage.setItem('civic_event_key', key);
        return key;
    }
    // Fall back to localStorage, but ignore it if it doesn't match the
    // server-side key (prevents stale keys from old events breaking submissions)
    const stored = localStorage.getItem('civic_event_key');
    if (stored && typeof EVENT_KEY !== 'undefined' && EVENT_KEY && stored !== EVENT_KEY) {
        // Stale key — overwrite with the server-injected correct key
        localStorage.setItem('civic_event_key', EVENT_KEY);
        return EVENT_KEY;
    }
    return stored || (typeof EVENT_KEY !== 'undefined' ? EVENT_KEY : null);
};

async function init() {
    const key = getEventKey();

    if (!key) {
        progressWrapper.style.display = 'none';
        app.innerHTML = `
            <div class="card" style="text-align: center;">
                <h2>Welcome!</h2>
                <p>Please scan the QR code to participate on your device, or enter the event key below:</p>
                <div style="margin: 20px 0;">
                    <img src="/static/qr.png" alt="Event QR Code" style="width: 200px; height: 200px; background: white; padding: 10px; border-radius: 8px;">
                </div>
                <form onsubmit="event.preventDefault(); window.location.search = '?key=' + document.getElementById('manual-key').value;">
                    <input type="text" id="manual-key" class="btn" style="background:var(--idea-bubble-bg); color:var(--text); border:1px solid var(--border); text-align:center; margin-bottom:10px;" placeholder="ENTER KEY">
                    <button type="submit" class="btn btn-primary">Join Event</button>
                </form>
            </div>`;
        return;
    }

    if (currentIdx === 0) {
        renderKioskStart();
        return;
    }

    try {
        const res = await fetch('/questions');
        questions = await res.json();
        renderQuestion();
    } catch (err) {
        app.innerHTML = '<div class="card"><p>Error loading questions. Please check your connection.</p></div>';
    }
}

function updateProgress() {
    if (questions.length === 0 || currentIdx >= questions.length) {
        progressWrapper.style.display = 'none';
        progressText.innerText = '';
        return;
    }
    progressWrapper.style.display = 'block';
    const percent = ((currentIdx) / questions.length) * 100;
    progressBar.style.width = `${percent}%`;
    progressText.innerText = `Question ${currentIdx + 1} of ${questions.length}`;
}

function renderKioskStart() {
    updateProgress();
    app.innerHTML = `
        <div class="card" style="text-align: center; padding: 60px 20px;">
            <h1 style="font-size: 2.5rem; margin-bottom: 20px;">Share Your Ideas</h1>
            <p style="font-size: 1.25rem; color: var(--text-muted); margin-bottom: 40px;">Take a quick poll and let your voice be heard.</p>
            <button onclick="startKiosk()" class="btn btn-primary" style="font-size: 1.5rem; padding: 24px;">Start</button>
        </div>
    `;
}

async function startKiosk() {
    const res = await fetch('/questions');
    questions = await res.json();
    currentIdx = 0;
    renderQuestion();
}

let kioskTimer = null;

async function resetKiosk() {
    if (kioskTimer) clearTimeout(kioskTimer);
    await fetch('/reset_session', { method: 'POST' });
    currentIdx = 0;
    init();
}

function renderQuestion() {
    updateProgress();

    if (questions.length === 0) {
        app.innerHTML = '<div class="card"><p>No active questions at the moment. Stay tuned!</p></div>';
        return;
    }

    if (currentIdx >= questions.length) {
        app.innerHTML = `
            <div class="card" style="text-align: center;">
                <h2>Thank you!</h2>
                <p>Your feedback has been recorded.</p>
                <button onclick="resetKiosk()" class="btn btn-primary" style="margin-top: 20px;">Finish</button>
            </div>`;
        kioskTimer = setTimeout(resetKiosk, 10000);
        return;
    }

    const q = questions[currentIdx];
    let html = `<div class="card">
        <h2 style="color:var(--accent); margin-top:0;">${q.title}</h2>
        <p style="color:var(--text-muted); margin-bottom:25px;">${q.description || ''}</p>
        <div class="options" id="options-container">`;

    if (q.type === 'single_select') {
        q.options.forEach(opt => {
            html += `<div class="poll-option" onclick="submitSingle(${q.id}, '${opt}')">${opt}</div>`;
        });
    } else if (q.type === 'multi_select') {
        q.options.forEach((opt, i) => {
            html += `
                <label class="poll-option" style="display:flex; align-items:center; gap:12px;">
                    <input type="checkbox" name="multi" value="${opt}" style="width:20px; height:20px; margin:0;">
                    <span>${opt}</span>
                </label>`;
        });
        html += `</div><button class="btn btn-primary" style="margin-top:20px;" onclick="submitMulti(${q.id})">Submit Selection</button>`;
    } else if (q.type === 'short_text' || q.type === 'word_cloud') {
        html += `<textarea id="text-input" class="btn" style="background:var(--idea-bubble-bg); color:var(--text); border:1px solid var(--border); text-align:left; min-height:100px;" placeholder="Type your response..."></textarea>
                 <button class="btn btn-primary" style="margin-top:10px;" onclick="submitText(${q.id})">Submit</button>`;
    } else if (q.type === 'ranking') {
        html += `<div id="sortable-list">`;
        q.options.forEach(opt => {
            html += `
                <div class="poll-option ranking-item" data-id="${opt}">
                    <span class="drag-handle">☰</span>
                    <span>${opt}</span>
                </div>`;
        });
        html += `</div><button class="btn btn-primary" style="margin-top:20px;" onclick="submitRanking(${q.id})">Submit Ranking</button>`;
    }

    html += `</div></div>`;

    html += `<button onclick="resetKiosk()" class="btn" style="background: transparent; border: 1px solid var(--border); color: var(--text-muted); margin-top: 20px;">Home</button>`;

    app.innerHTML = html;

    if (q.type === 'ranking') {
        new Sortable(document.getElementById('sortable-list'), {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost'
        });
    }
}

async function submitSingle(questionId, option) {
    const key = getEventKey();
    const res = await fetch(`/submit?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, selected_options: [option] })
    });
    if (res.ok) {
        currentIdx++;
        renderQuestion();
    }
}

async function submitMulti(questionId) {
    const selected = Array.from(document.querySelectorAll('input[name="multi"]:checked')).map(el => el.value);
    if (selected.length === 0) return;

    const key = getEventKey();
    const res = await fetch(`/submit?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, selected_options: selected })
    });
    if (res.ok) {
        currentIdx++;
        renderQuestion();
    }
}

async function submitText(questionId) {
    const textInput = document.getElementById('text-input');
    const text = textInput.value.trim();
    if (!text) {
        textInput.style.borderColor = '#ef4444';
        return;
    }
    const key = getEventKey();
    const res = await fetch(`/submit?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, text: text })
    });
    if (res.ok) {
        currentIdx++;
        renderQuestion();
    }
}

async function submitRanking(questionId) {
    const items = Array.from(document.querySelectorAll('.ranking-item')).map(el => el.getAttribute('data-id'));
    const key = getEventKey();
    const res = await fetch(`/submit?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, ranking: items })
    });
    if (res.ok) {
        currentIdx++;
        renderQuestion();
    }
}

init();
