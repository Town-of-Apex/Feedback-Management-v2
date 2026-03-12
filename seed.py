from app import create_app, db
from app.models import Question
import os

app = create_app()
with app.app_context():
    # Only seed if empty
    if Question.query.count() == 0:
        q1 = Question(
            title="What is your top priority for the park?",
            description="Pick one that matters most to you.",
            type="single_select",
            options=["More Trees", "Better Lighting", "New Playground", "Dog Park"],
            active=True,
            order_index=1
        )
        q2 = Question(
            title="Any other ideas for the event?",
            description="Share your thoughts for next year.",
            type="short_text",
            active=True,
            order_index=2
        )
        db.session.add(q1)
        db.session.add(q2)
        db.session.commit()
        print("Database seeded with sample questions!")
    else:
        print("Database already has questions.")
