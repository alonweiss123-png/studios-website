"""מסנכרן FAQPage schema לטקסט הגלוי בדף. גוגל דורש התאמה מלאה."""
import re, json, html, sys, glob

def visible_faq(s):
    out = []
    for m in re.finditer(r'(?is)<summary>(.*?)</summary>\s*<div class="faq-body">(.*?)</div>', s):
        q = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m.group(1)))).strip()
        a = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m.group(2)))).strip()
        if q and a: out.append((q, a))
    return out

changed = []
for p in sys.argv[1:]:
    s = open(p, encoding="utf-8").read()
    faq = visible_faq(s)
    if not faq: continue
    hit = False
    for block in re.findall(r'(?is)<script[^>]*ld\+json[^>]*>(.*?)</script>', s):
        try: j = json.loads(block)
        except Exception: continue
        def walk(o):
            global hit
            if isinstance(o, dict):
                if o.get("@type") == "FAQPage":
                    o["mainEntity"] = [{
                        "@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a}
                    } for q, a in faq]
                    hit = True
                for v in o.values(): walk(v)
            elif isinstance(o, list):
                for v in o: walk(v)
        walk(j)
        if hit:
            s = s.replace(block, "\n" + json.dumps(j, ensure_ascii=False, indent=2) + "\n", 1)
            open(p, "w", encoding="utf-8").write(s)
            changed.append((p, len(faq)))
            break
for p, n in changed:
    print(f"  ✓ {p}: סכימת FAQ סונכרנה ל-{n} שאלות")
if not changed: print("  · לא נמצא מה לסנכרן")
