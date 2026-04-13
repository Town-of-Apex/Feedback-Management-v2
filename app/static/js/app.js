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
                <h2 class="title-font">Welcome</h2>
                <p>Please scan the QR code to participate on your device, or enter the event key below:</p>
                <div style="margin: 2rem 0;">
                    <img src="/static/qr.png" alt="Event QR Code" style="width: 200px; height: 200px; background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border-line);">
                </div>
                <form onsubmit="event.preventDefault(); window.location.search = '?key=' + document.getElementById('manual-key').value;">
                    <input type="text" id="manual-key" style="text-align:center; margin-bottom:1rem;" placeholder="ENTER KEY">
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Join Event</button>
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
        <div class="card" style="padding: 4rem 2rem;">
            <h1 class="title-font" style="font-size: 3rem; margin-bottom: 1.5rem;">Share Your Ideas</h1>
            <p style="font-size: 1.25rem; color: var(--text-muted); margin-bottom: 3rem;">Take a quick poll and let your voice be heard.</p>
            <button onclick="startKiosk()" class="btn btn-primary" style="font-size: 1.25rem; padding: 1.5rem 3rem;">Start</button>
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
            <div class="card">
                <h2 class="title-font">Thank you</h2>
                <p>Your feedback has been recorded. This session will reset shortly.</p>
                <button onclick="resetKiosk()" class="btn btn-primary" style="margin-top: 2rem;">Finish Now</button>
            </div>`;
        kioskTimer = setTimeout(resetKiosk, 10000);
        return;
    }

    const q = questions[currentIdx];
    let html = `<div class="card">
        <h2 class="title-font">${q.title}</h2>
        <p style="color:var(--text-muted); margin-bottom:2rem;">${q.description || ''}</p>
        <div class="options" id="options-container">`;

    if (q.type === 'single_select') {
        q.options.forEach(opt => {
            const isOther = opt.toLowerCase() === 'other';
            html += `<div class="poll-option" onclick="submitSingle(${q.id}, '${opt}')">${opt}</div>`;
            if (isOther) {
                html += `<input type="text" id="other-input-${q.id}" style="display:none; margin-bottom:1rem;" placeholder="Please specify...">`;
            }
        });
    } else if (q.type === 'multi_select') {
        q.options.forEach((opt, i) => {
            const isOther = opt.toLowerCase() === 'other';
            html += `
                <label class="poll-option">
                    <input type="checkbox" name="multi" value="${opt}" style="width:1.25rem; height:1.25rem; margin:0;" onchange="${isOther ? `document.getElementById('other-input-${q.id}').style.display = this.checked ? 'block' : 'none'` : ''}">
                    <span>${opt}</span>
                </label>`;
            if (isOther) {
                html += `<input type="text" id="other-input-${q.id}" style="display:none; margin-bottom:1rem;" placeholder="Please specify...">`;
            }
        });
        html += `</div><button class="btn btn-primary" style="margin-top:2rem; width:100%;" onclick="submitMulti(${q.id})">Submit Selection</button>`;
    } else if (q.type === 'short_text' || q.type === 'word_cloud') {
        html += `<textarea id="text-input" style="min-height:120px;" placeholder="Type your response..."></textarea>
                 <button class="btn btn-primary" style="margin-top:1rem; width:100%;" onclick="submitText(${q.id})">Submit Response</button>`;
    } else if (q.type === 'ranking') {
        html += `<div id="sortable-list">`;
        q.options.forEach(opt => {
            html += `
                <div class="poll-option ranking-item" data-id="${opt}">
                    <span class="drag-handle" style="color:var(--rosy); display: flex; align-items: center;">
                        <svg viewBox="0 0 24 24" style="width:1.5rem; height:1.5rem; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round;"><path d="M8 9h8M8 12h8M8 15h8"/></svg>
                    </span>
                    <span>${opt}</span>
                </div>`;
        });
        html += `</div><button class="btn btn-primary" style="margin-top:2rem; width:100%;" onclick="submitRanking(${q.id})">Submit Ranking</button>`;
    }

    html += `</div></div>`;

    html += `<button onclick="resetKiosk()" class="btn btn-secondary" style="width:100%; margin-top: 1rem;">Cancel & Reset</button>`;

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
    if (option.toLowerCase() === 'other') {
        const otherInput = document.getElementById('other-input-' + questionId);
        if (otherInput.style.display === 'none') {
            otherInput.style.display = 'block';
            otherInput.focus();
            return;
        }
        const val = otherInput.value.trim();
        if (!val) {
            otherInput.style.borderColor = '#ef4444';
            return;
        }
        option = "Other: " + val;
    }

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
    const selected = Array.from(document.querySelectorAll('input[name="multi"]:checked')).map(el => {
        if (el.value.toLowerCase() === 'other') {
            const val = document.getElementById('other-input-' + questionId).value.trim();
            return val ? "Other: " + val : null;
        }
        return el.value;
    }).filter(v => v !== null);
    
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
        const q = questions[currentIdx];
        if (q.allow_votes) {
            renderVotingSession(questionId);
        } else {
            currentIdx++;
            renderQuestion();
        }
    }
}

async function renderVotingSession(questionId) {
    app.innerHTML = `
        <div class="card">
            <h2 class="title-font">Great Idea</h2>
            <p style="margin-bottom:2rem;">What do you think of these other ideas from the community?</p>
            <div id="vote-container">
                <p>Loading others...</p>
            </div>
            <button onclick="currentIdx++; renderQuestion();" class="btn btn-secondary" style="margin-top:2rem; width:100%;">Skip to Next Question</button>
        </div>
    `;

    try {
        const res = await fetch(`/questions/${questionId}/responses`);
        const data = await res.json();
        const container = document.getElementById('vote-container');
        
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No other ideas to vote on yet. You\'re one of the first!</p>';
            return;
        }

        container.innerHTML = data.map(r => `
            <div class="poll-option" style="cursor:default; justify-content:space-between;">
                <span style="flex:1;">${r.text}</span>
                <div style="display:flex; gap:0.5rem;">
                    <button onclick="voteResponse(${r.id}, 'up', ${questionId}, this)" class="btn btn-secondary" style="padding:0.5rem; width:40px; height:40px;">
                        <svg viewBox="0 0 24 24" class="icon" style="color:var(--success)"><path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button onclick="voteResponse(${r.id}, 'down', ${questionId}, this)" class="btn btn-secondary" style="padding:0.5rem; width:40px; height:40px;">
                        <svg viewBox="0 0 24 24" class="icon" style="color:var(--danger)"><path d="M12 5v14M12 19l-7-7M12 19l7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function voteResponse(responseId, voteType, questionId, btn) {
    const key = getEventKey();
    const res = await fetch(`/vote?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_id: responseId, vote_type: voteType })
    });
    
    if (res.ok) {
        // Find the parent poll-option and hide it or mark as voted
        const parent = btn.closest('.poll-option');
        parent.style.opacity = '0.5';
        parent.style.pointerEvents = 'none';
        btn.parentElement.innerHTML = '<span style="color:var(--success); font-weight:bold;">Voted!</span>';
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
