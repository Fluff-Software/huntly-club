import re
with open('components/compass/DiffReviewer.tsx', 'r') as f:
    content = f.read()

bad_ui = r'\s*\{\/\* Refinement Area \*\/}.*?Compass will read these generated missions and adjust them based on your feedback\.\s*<\/p>\s*<\/div>\s*\}'

content = re.sub(bad_ui, "", content, count=2, flags=re.DOTALL)

with open('components/compass/DiffReviewer.tsx', 'w') as f:
    f.write(content)
