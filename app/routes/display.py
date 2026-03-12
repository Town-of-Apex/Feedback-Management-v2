import os
from flask import Blueprint, render_template
from ..models import Question

display_bp = Blueprint('display', __name__)

@display_bp.route('/')
def display_dashboard():
    event_name = os.getenv('EVENT_NAME', 'Civic Feedback Event')
    return render_template('display.html', event_name=event_name)
