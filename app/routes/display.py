import os
from flask import Blueprint, render_template

display_bp = Blueprint('display', __name__)

@display_bp.route('/')
def display_dashboard():
    event_name = os.getenv('EVENT_NAME', 'Civic Feedback Event')
    return render_template('display.html', event_name=event_name)

@display_bp.route('/slideshow')
def display_slideshow():
    event_name = os.getenv('EVENT_NAME', 'Civic Feedback Event')
    return render_template('display_slideshow.html', event_name=event_name)
