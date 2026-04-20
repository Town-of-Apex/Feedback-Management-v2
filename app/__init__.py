import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv()

db = SQLAlchemy()
socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    
    # Handle reverse proxy headers
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # If APPLICATION_ROOT is set, force it as the SCRIPT_NAME
    # This allows the app to know it's served from a sub-path without relying on Nginx headers
    app_root = os.getenv('APPLICATION_ROOT', '')
    if app_root:
        def prefix_middleware(environ, start_response):
            path = environ.get('PATH_INFO', '')
            if path.startswith(app_root):
                environ['PATH_INFO'] = path[len(app_root):]
                environ['SCRIPT_NAME'] = app_root
            return app.wsgi_app(environ, start_response)
        app.wsgi_app = prefix_middleware
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.getcwd(), 'data', 'feedback.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")

    with app.app_context():
        from . import models
        db.create_all()

    from .routes.public import public_bp
    from .routes.admin import admin_bp
    from .routes.display import display_bp
    
    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(display_bp, url_prefix='/display')

    @app.context_processor
    def inject_vars():
        # Force script_root if APPLICATION_ROOT is set
        root = os.getenv('APPLICATION_ROOT', '')
        return dict(app_root=root)
    
    return app
