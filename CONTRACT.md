# חוזה בנייה — studios.ninja (חובה לקרוא לפני כתיבת דף)

## עובדות אמת — אסור לסטות מהן
- מותג: **Studios** · דומיין `https://studios.ninja`
- טלפון **058-787-9796** · וואטסאפ `https://wa.me/972587879796` · מייל **hello@studios.ninja**
- **Shopify Partner רשמי**
- מספרים מותרים (מצטברים בלבד): **47 אתרי חנות** · **₪2,400,000 מכירות** · **3.2% יחס המרה ממוצע**
- אחריות: **30 ימי תיקונים** אחרי השקה · תשובה תוך **24 שעות** · שיחת ייעוץ **15 דקות חינם**
- לו״ז: אתר חנות ממוצע **כשבועיים**, מורכב **עד 6 שבועות**

### 🚫 איסורים מוחלטים
1. **אסור להמציא ציטוטי לקוחות, שמות לקוחות, או המלצות.** אם צריך המלצה — להשתמש רק ב-7 סרטוני היוטיוב הקיימים.
2. **אסור לפרסם מספרי ביצוע של לקוח ספציפי** (מחזור, אחוזי המרה, גידול). רק קטגוריות שירות, תגיות תעשייה ותיאור איכותני.
3. **אסור להמציא מחירים.** מחיר = "בשיחת ייעוץ, הצעה מדויקת תוך 24 שעות".
4. **אסור אימוג'י בשום מקום.** אייקונים = SVG inline בלבד, `stroke-width` 1.6, `fill="none"`.
5. אסור להוסיף ספריות חיצוניות, פונטים נוספים או CDN.

## תיק העבודות — 6 פרויקטים, כולם חיים ומאומתים
| מותג | דומיין | תחום | תמונה |
|---|---|---|---|
| ŌNN | https://onn.co.il/ | מזון פונקציונלי | /port-onn.webp |
| Hybrid by Amit Portal | https://hybrid-israel.com | תוספי ספורט | /port-hybrid.webp |
| IL CAPITANO | https://ilcapitano.store/ | טיפוח · מותג בינלאומי | /port-capitano.webp |
| Dezernoo | https://dezernoo.co.il | אופנה · Streetwear | /port-dezernoo.webp |
| Sensei Titanium | https://senseiil.com/ | אביזרי מטבח פרמיום | /port-sensei.webp |
| Sheket Earplugs | https://sheketearplugs.com/ | בריאות · אקוסטיקה | /port-sheket.webp |

## מבנה כל דף — להעתיק בדיוק
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <!-- העתק את כל בלוק ה-head מ-index.html עד </head>, והחלף:
         title / meta description / canonical / og:url / og:title / og:description
         ואת בלוק ה-JSON-LD (ראה למטה) -->
  </head>
  <body>
    <!-- העתק את <a class="skip">, <header class="hdr">…</header> ואת <div class="sheet">
         מ-index.html בדיוק כמו שהם -->
    <main id="main"> … </main>
    <!-- העתק את <footer class="ftr">…</footer>, כפתור .wa, ו-<script src="/assets/app.js" defer>
         מ-index.html בדיוק כמו שהם -->
  </body>
</html>
```

## מערכת העיצוב — `/assets/studios.css` (לא לערוך! רק להשתמש)
**מבנה:** `.sec` `.sec-line` `.shell` `.grid .g2 .g3 .g4`
**כותרות:** `.h-xl .h-lg .h-md .h-sm` · `.lead .body-2 .small .mono .dim .hl`
**תווית סקשן:** `<span class="eyebrow">טקסט</span>`
**כפתורים:** `.btn .btn-primary .btn-ghost .btn-lg .btn-sm` · קישור-חץ `.link-a`
**משטחים:** `.card .card--lift` · `.tag .tag--acid` · `.pill` (עם `<span class="dot">`)
**אייקון:** `<div class="itile"><svg …></svg></div>` (או `.itile--plain`)
**שלבים:** `.rail > .step > .step-dot + .step-body`
**תיק עבודות:** `.work-grid > .work > .work-shot + .work-body`
**שאלות נפוצות:** `.faq > details > summary + .faq-body` (native details)
**צוות:** `.team-grid > .person`
**מאמר:** `.prose` · `.tldr` · `.meta-row` · `.crumb`
**אנימציה:** להוסיף `rv` לכל אלמנט שצריך להיכנס בגלילה, ו-`rv-d1`…`rv-d6` להשהיה מדורגת
**שמיים:** להוסיף בתוך סקשן `position:relative`:
```html
<div class="sky" aria-hidden="true">
  <div class="sky-l sky-far"></div><div class="sky-l sky-mid"></div>
  <div class="sky-l sky-near"></div><div class="sky-l sky-bleed"></div>
  <div class="sky-horizon"></div>
</div>
```
או באנד מפריד: `<div class="band"><div class="sky">…3 שכבות…</div><div class="band-cap"><p>…</p></div></div>`

## חובה בכל דף
- `<h1>` אחד ויחיד
- `<title>` ייחודי בפורמט `<מילת מפתח> | Studios`
- `<meta name="description">` ייחודי, 140-160 תווים
- `<link rel="canonical">` מלא
- JSON-LD: `BreadcrumbList` תמיד + `Service` (דף שירות) / `Article` (מאמר) / `FAQPage` (אם יש שאלות)
- כל `<img>` עם `alt` תיאורי, `loading="lazy"`, `width` ו-`height`
- CTA לפחות פעמיים בדף, אחד מהם `/#contact`

## סגנון כתיבה
עברית עסקית, ישירה, בגוף שני רבים ("אתם"). משפטים קצרים.
בלי מקפים ארוכים (—) בטקסט שיווקי, בלי גרשיים מסולסלים, בלי "לא רק X אלא גם Y".
טון: חברת הנדסה שמוכרת תוצאה. לא סוכנות שמוכרת יופי.
