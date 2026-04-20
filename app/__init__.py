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
    # AAS-1.0: Retrieve BASE_PATH from environment
    base_path = os.getenv('BASE_PATH', '').rstrip('/')
    
    app = Flask(__name__, static_url_path=base_path + '/static' if base_path else '/static')
    
    # Handle reverse proxy headers (AAS-1.0 requirement)
    # This allows url_for to automatically prepend the X-Forwarded-Prefix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.getcwd(), 'data', 'feedback.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    # AAS-1.0: Ensure socketio respects the sub-path
    socketio.init_app(app, cors_allowed_origins="*", path=base_path + '/socket.io' if base_path else '/socket.io')

    with app.app_context():
        from . import models
        db.create_all()

    from .routes.public import public_bp
    from .routes.admin import admin_bp
    from .routes.display import display_bp
    
    # AAS-1.0: Register blueprints with prepended BASE_PATH (Traefik-friendly)
    app.register_blueprint(public_bp, url_prefix=base_path if base_path else '/')
    app.register_blueprint(admin_bp, url_prefix=base_path + '/admin')
    app.register_blueprint(display_bp, url_prefix=base_path + '/display')

    # Inject BASE_PATH into templates for explicit asset prefixing
    app.jinja_env.globals['BASE_PATH'] = base_path
    
    # AAS-1.0: Inject global base path variables for templates (legacy support if needed)
    @app.context_processor
    def inject_vars():
        return dict(
            base_url=base_path + '/' if base_path else '/',
            app_base_path=base_path
        )
    
    return app
