from flask import Blueprint, render_template, request, redirect, session, jsonify
import os
from ..models import Question, Response, db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/')
def dashboard():
    # Simple hardcoded check for now as per plan
    if not session.get('is_admin'):
        return render_template('admin_login.html')
    
    questions = Question.query.order_by(Question.order_index.asc()).all()
    return render_template('admin.html', questions=questions)

@admin_bp.route('/login', methods=['POST'])
def login():
    if request.form.get('password') == os.getenv('ADMIN_PASSWORD'):
        session['is_admin'] = True
        return redirect('/admin')
    return "Unauthorized", 401

@admin_bp.route('/questions/add', methods=['POST'])
def add_question():
    if not session.get('is_admin'): return "Unauthorized", 401
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
    if not session.get('is_admin'): return "Unauthorized", 401
    q = Question.query.get_or_404(id)
    q.active = not q.active
    db.session.commit()
    return redirect('/admin')

@admin_bp.route('/questions/<int:id>/delete', methods=['POST'])
def delete_question(id):
    if not session.get('is_admin'): return "Unauthorized", 401
    q = Question.query.get_or_404(id)
    db.session.delete(q)
    db.session.commit()
    return redirect('/admin')
