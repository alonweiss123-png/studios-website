"""Studios — בדיקת תקינות לכל דפי האתר."""
import glob, re, json, os, sys, html

SKIP = {"_preview.html", "index.new.html"}
ROOT = "https://studios.ninja"
issues = []
rows = []

files = sorted(set(glob.glob("*.html") + glob.glob("*/*.html")))
files = [f for f in files if os.path.basename(f) not in SKIP and not f.startswith("_")]

for f in files:
    s = open(f, encoding="utf-8", errors="replace").read()
    def one(pat, flags=re.I | re.S):
        m = re.search(pat, s, flags)
        return m.group(1).strip() if m else None

    title = one(r"<title[^>]*>(.*?)</title>")
    desc  = one(r'<meta\s+name="description"\s+content="([^"]*)"') or \
            one(r'<meta\s+name="description"[^>]*content="([^"]*)"')
    canon = one(r'<link[^>]*rel="canonical"[^>]*href="([^"]*)"')
    h1s   = re.findall(r"(?is)<h1[^>]*>(.*?)</h1>", s)
    noidx = bool(re.search(r'name="robots"[^>]*noindex', s, re.I))

    body = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", s)
    words = len(re.sub(r"(?is)<[^>]+>", " ", body).split())

    # schema
    types = []
    for b in re.findall(r'(?is)<script[^>]*ld\+json[^>]*>(.*?)</script>', s):
        try:
            j = json.loads(b)
        except Exception as e:
            issues.append(f"{f}: JSON-LD שבור — {str(e)[:60]}")
            continue
        def walk(o):
            if isinstance(o, dict):
                t = o.get("@type")
                if isinstance(t, str): types.append(t)
                elif isinstance(t, list): types.extend(t)
                for v in o.values(): walk(v)
            elif isinstance(o, list):
                for v in o: walk(v)
        walk(j)

    imgs = re.findall(r"<img[^>]*>", s)
    no_alt  = [i for i in imgs if "alt=" not in i]
    no_dim  = [i for i in imgs if not ("width=" in i and "height=" in i)]
    emoji = re.findall(r"[\U0001F300-\U0001FAFF☀-➿]", body)

    if not noidx:
        if not title: issues.append(f"{f}: אין <title>")
        if not desc:  issues.append(f"{f}: אין meta description")
        elif not (100 <= len(desc) <= 175): issues.append(f"{f}: אורך description {len(desc)} (רצוי 140-160)")
        if not canon: issues.append(f"{f}: אין canonical")
        if len(h1s) != 1: issues.append(f"{f}: {len(h1s)} תגיות H1 (צריך בדיוק 1)")
        if not types: issues.append(f"{f}: אין JSON-LD")
    if no_alt: issues.append(f"{f}: {len(no_alt)} תמונות בלי alt")
    if no_dim: issues.append(f"{f}: {len(no_dim)} תמונות בלי width/height")
    if emoji:  issues.append(f"{f}: {len(emoji)} אימוג'י בתוכן — אסור")
    if "studios.css" not in s: issues.append(f"{f}: לא טוען studios.css")
    if "app.js" not in s and not noidx: issues.append(f"{f}: לא טוען app.js")

    rows.append((f, words, len(h1s), "✓" if canon else "✗",
                 ",".join(sorted(set(types)))[:44] or "—", "noindex" if noidx else ""))

print(f"{'דף':<34}{'מילים':>7}{'H1':>4}{'can':>5}  schema")
print("─" * 104)
for r in rows:
    print(f"{r[0]:<34}{r[1]:>7}{r[2]:>4}{r[3]:>5}  {r[4]} {r[5]}")
print("─" * 104)
print(f"סה\"כ {len(rows)} דפים · {sum(r[1] for r in rows):,} מילים")
print()
if issues:
    print(f"⚠ {len(issues)} בעיות:")
    for i in issues: print("  ·", i)
else:
    print("✓ אין בעיות")
sys.exit(0)
