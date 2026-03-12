from datetime import datetime
from . import db

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.String(50), nullable=False) # single_select, multi_select, ranking, short_text, word_cloud
    options = db.Column(db.JSON) # List of strings for polls/ranking
    allow_votes = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)
    order_index = db.Column(db.Integer, default=0)
    responses = db.relationship('Response', backref='question', lazy=True, cascade="all, delete-orphan")

class Response(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    user_session_id = db.Column(db.String(100), nullable=False)
    text = db.Column(db.Text)
    selected_options = db.Column(db.JSON) # List of indices or strings
    ranking = db.Column(db.JSON) # Ordered list
    votes_up = db.Column(db.Integer, default=0)
    votes_down = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    votes = db.relationship('Vote', backref='response', lazy=True, cascade="all, delete-orphan")

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    response_id = db.Column(db.Integer, db.ForeignKey('response.id'), nullable=False)
    user_session_id = db.Column(db.String(100), nullable=False)
    vote_type = db.Column(db.String(10)) # 'up' or 'down'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
