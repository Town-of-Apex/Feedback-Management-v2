from flask import Blueprint, render_template, request, redirect, session, jsonify, make_response
import os
import io
import csv
from ..models import Question, Response, db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/')
def dashboard():
    questions = Question.query.order_by(Question.order_index.asc()).all()
    return render_template('admin.html', questions=questions)

@admin_bp.route('/questions/add', methods=['POST'])
def add_question():
    data = request.form
    new_q = Question(
        title=data['title'],
        description=data.get('description'),
        type=data['type'],
        options=data.get('options', '').split(',') if data.get('options') else []
    )
    db.session.add(new_q)
    db.session.commit()
    return redirect('/admin')

@admin_bp.route('/questions/<int:id>/toggle', methods=['POST'])
def toggle_question(id):
    q = Question.query.get_or_404(id)
    q.active = not q.active
    db.session.commit()
    return redirect('/admin')

@admin_bp.route('/questions/<int:id>/edit', methods=['GET', 'POST'])
def edit_question(id):
    q = Question.query.get_or_404(id)
    
    if request.method == 'GET':
        return render_template('edit_question.html', question=q)
    
    data = request.form
    action = data.get('action')
    
    # Handle re-creating as a separate question (archiving old)
    if action == 'recreate':
        # Deactivate the old one
        q.active = False
        
        # Create a new one
        new_q = Question(
            title=data['title'],
            description=data.get('description'),
            type=data['type'],
            options=data.get('options', '').split(',') if data.get('options') else [],
            order_index=q.order_index # Keep same order
        )
        db.session.add(new_q)
        db.session.commit()
        return redirect('/admin')
    
    # Otherwise, update the existing one
    q.title = data.get('title')
    q.description = data.get('description')
    q.type = data.get('type')
    q.options = data.get('options', '').split(',') if data.get('options') else []
    
    db.session.commit()
    return redirect('/admin')

@admin_bp.route('/export')
def export_data():
    # Query all responses joined with their questions
    responses = db.session.query(Response, Question).join(Question, Response.question_id == Question.id).order_by(Response.timestamp.desc()).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Response ID', 'Timestamp', 'Question ID', 'Question Title', 'Question Type', 'User Session ID', 'Response Value', 'Upvotes', 'Downvotes'])
    
    for r, q in responses:
        # Format the response value based on the type
        val = ""
        if q.type in ['single_select', 'multi_select']:
            val = ", ".join(r.selected_options) if r.selected_options else ""
        elif q.type == 'ranking':
            val = " > ".join(r.ranking) if r.ranking else ""
        else: # short_text, word_cloud
            val = r.text or ""
            
        writer.writerow([
            r.id,
            r.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            q.id,
            q.title,
            q.type,
            r.user_session_id,
            val,
            r.votes_up,
            r.votes_down
        ])
    
    # Create response
    csv_body = output.getvalue()
    response = make_response(csv_body)
    response.headers["Content-Disposition"] = "attachment; filename=feedback_responses.csv"
    response.headers["Content-type"] = "text/csv; charset=utf-8"
    
    return response

@admin_bp.route('/questions/<int:id>/delete', methods=['POST'])
def delete_question(id):
    q = Question.query.get_or_404(id)
    db.session.delete(q)
    db.session.commit()
    return redirect('/admin')
