from flask import Blueprint, render_template, jsonify, request, session
import uuid
import os
from ..models import Question, Response, Vote
from .. import db, socketio

public_bp = Blueprint('public', __name__)

@public_bp.before_request
def ensure_session_id():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())

@public_bp.route('/reset_session', methods=['POST'])
def reset_session():
    session.clear()
    return jsonify({'success': True})

@public_bp.route('/')
def index():
    event_name = os.getenv('EVENT_NAME', 'Civic Feedback Event')
    event_key = os.getenv('EVENT_KEY', '').strip('"\'  ')
    return render_template('index.html', event_name=event_name, event_key=event_key)

@public_bp.route('/questions')
def get_questions():
    questions = Question.query.filter_by(active=True).order_by(Question.order_index).all()
    return jsonify([{
        'id': q.id,
        'title': q.title,
        'description': q.description,
        'type': q.type,
        'options': q.options,
        'allow_votes': q.allow_votes
    } for q in questions])

@public_bp.route('/submit', methods=['POST'])
def submit_response():
    data = request.json
    key = request.args.get('key')
    if key != os.getenv('EVENT_KEY', '').strip('"\' '):
        return jsonify({'error': 'Invalid event key'}), 403

    # Submission allowed even if text has profanity, but it won't be displayed on results

    new_response = Response(
        question_id=data['question_id'],
        user_session_id=session['user_id'],
        text=data.get('text'),
        selected_options=data.get('selected_options'),
        ranking=data.get('ranking')
    )
    db.session.add(new_response)
    db.session.commit()

    # Trigger real-time update
    socketio.emit('new_response', {'question_id': data['question_id']})
    
    return jsonify({'success': True, 'id': new_response.id}), 201

@public_bp.route('/results')
def get_results():
    questions = Question.query.filter_by(active=True).all()
    results = []
    for q in questions:
        if q.type in ['single_select', 'multi_select']:
            # ... (poll code)
            counts = {opt: 0 for opt in q.options}
            responses = Response.query.filter_by(question_id=q.id).all()
            for r in responses:
                if r.selected_options:
                    for opt in r.selected_options:
                        if opt in counts:
                            counts[opt] += 1
            results.append({
                'id': q.id,
                'title': q.title,
                'type': q.type,
                'data': counts
            })
        elif q.type == 'short_text':
            from ..utils import contains_profanity
            all_responses = Response.query.filter_by(question_id=q.id).order_by(Response.timestamp.desc()).all()
            
            # Filter in Python
            clean_responses = [r for r in all_responses if not (r.text and contains_profanity(r.text))]
            
            results.append({
                'id': q.id,
                'title': q.title,
                'type': q.type,
                'total': len(clean_responses),
                'data': [{'text': r.text} for r in clean_responses[:10]]
            })
        elif q.type == 'word_cloud':
            from ..utils import clean_text_for_wordcloud
            all_words = []
            responses = Response.query.filter_by(question_id=q.id).all()
            for r in responses:
                if r.text:
                    all_words.extend(clean_text_for_wordcloud(r.text))
            
            # Count word frequencies
            freq = {}
            for w in all_words:
                freq[w] = freq.get(w, 0) + 1
            
            # Convert to list of [word, frequency] for WordCloud2.js
            word_list = [[w, f] for w, f in freq.items()]
            results.append({
                'id': q.id,
                'title': q.title,
                'type': q.type,
                'data': word_list
            })
        elif q.type == 'ranking':
            # Scoring: If there are N items, 1st place gets N points, 2nd gets N-1, etc.
            scores = {opt: 0 for opt in q.options}
            responses = Response.query.filter_by(question_id=q.id).all()
            total_responses = len(responses)
            
            for r in responses:
                if r.ranking:
                    num_items = len(r.ranking)
                    for idx, opt in enumerate(r.ranking):
                        # Weight: 1st place gets num_items, last gets 1
                        points = num_items - idx
                        if opt in scores:
                            scores[opt] += points
            
            # Sort by total score descending
            sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            results.append({
                'id': q.id,
                'title': q.title,
                'type': q.type,
                'total_responses': total_responses,
                'data': sorted_scores # List of [option, total_score]
            })
    return jsonify(results)
