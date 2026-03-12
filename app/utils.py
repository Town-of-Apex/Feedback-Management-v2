import re
import csv
from pathlib import Path

STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at', 
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 
    'can', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 
    'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 
    'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', 
    'let', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 
    'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such', 
    'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 
    'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't", 
    'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves'
}

# --- Load banned words from CSV ---
BANNED_WORDS = []
csv_path = Path("profanity_en.csv")  # path to your CSV file

if csv_path.exists():
    with open(csv_path, newline='', encoding="utf-8") as f:
        reader = csv.reader(f)
        # first column only, strip whitespace, ignore empty lines, deduplicate
        BANNED_WORDS = list({row[0].strip() for row in reader if row and row[0].strip()})
else:
    print(f"Warning: {csv_path} not found. BANNED_WORDS is empty.")

# --- Profanity check ---
def contains_profanity(text):
    if not text:
        return False
    for word in BANNED_WORDS:
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

# --- Clean text for word cloud ---
def clean_text_for_wordcloud(text):
    if not text or contains_profanity(text):
        return []
    words = text.lower().replace('.', '').replace(',', '').replace('!', '').replace('?', '').split()
    return [w for w in words if w not in STOP_WORDS and len(w) > 2]