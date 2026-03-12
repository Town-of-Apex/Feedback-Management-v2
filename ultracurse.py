import csv

csv_file = "profanity_en.csv"

with open(csv_file, newline='', encoding="utf-8") as f:
    reader = csv.reader(f)
    words = [row[0].strip() for row in reader if row]  # take first column, strip whitespace

# Format as Python array literal
array_literal = "[" + ", ".join(f"'{word}'" for word in words) + "]"

print(array_literal)