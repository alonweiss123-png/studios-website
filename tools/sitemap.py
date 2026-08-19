import glob, os, re, datetime
today = datetime.date.today().isoformat()
SKIP = {"_preview.html", "index.new.html", "404.html", "thank-you.html", "questionnaire.html"}
urls = []
for f in sorted(set(glob.glob("*.html") + glob.glob("*/*.html"))):
    b = os.path.basename(f)
    if b in SKIP or f.startswith("_"): continue
    s = open(f, encoding="utf-8", errors="replace").read()
    if re.search(r'name="robots"[^>]*noindex', s, re.I): continue
    loc = "https://studios.ninja/" + ("" if f == "index.html" else f)
    loc = loc.replace("/index.html", "/")
    pri = "1.0" if f == "index.html" else ("0.8" if "/" not in f else "0.7")
    urls.append((loc, pri))
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for loc, pri in urls:
    out += ["  <url>", f"    <loc>{loc}</loc>", f"    <lastmod>{today}</lastmod>",
            f"    <priority>{pri}</priority>", "  </url>"]
out.append("</urlset>")
open("sitemap.xml", "w", encoding="utf-8").write("\n".join(out) + "\n")
print(f"✓ sitemap.xml — {len(urls)} כתובות")
for loc, _ in urls: print("   ", loc)
