/* ============================================================
   STUDIOS — Google Analytics 4 / Google Tag Manager
   ------------------------------------------------------------
   מלאו מזהה אחד כאן והמדידה נדלקת בכל האתר. כל עוד השדות ריקים
   הקובץ לא טוען כלום ולא שולח כלום — אין תופעות לוואי.

   איפה משיגים:
   GA4  → analytics.google.com ← Admin ← Data streams ← המזהה נראה G-XXXXXXXXXX
   GTM  → tagmanager.google.com ← המזהה נראה GTM-XXXXXXX

   מספיק אחד מהשניים. אם יש GTM, עדיף להגדיר את GA4 בתוכו.
   ============================================================ */
(function () {
  "use strict";

  var GA4_ID = "";   // ← לדוגמה: "G-ABC1234XYZ"
  var GTM_ID = "";   // ← לדוגמה: "GTM-ABC1234"

  function inject(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  /* --- GA4 --- */
  if (GA4_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID, { anonymize_ip: true });
    inject("https://www.googletagmanager.com/gtag/js?id=" + GA4_ID);
  }

  /* --- GTM --- */
  if (GTM_ID) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    inject("https://www.googletagmanager.com/gtm.js?id=" + GTM_ID);
  }

  if (!GA4_ID && !GTM_ID) return;

  /* --- אירועי המרה: אותם אירועים שכבר נשלחים למטא --- */
  function send(name, params) {
    if (window.gtag && GA4_ID) window.gtag("event", name, params || {});
    if (GTM_ID) window.dataLayer.push(Object.assign({ event: name }, params || {}));
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contactForm");
    if (form) {
      var started = false;
      form.addEventListener("input", function () {
        if (!started) { started = true; send("form_start", { form_id: "contact" }); }
      }, { once: false });
      form.addEventListener("submit", function () {
        send("generate_lead", { form_id: "contact" });
      });
    }
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
      a.addEventListener("click", function () { send("contact_whatsapp"); });
    });
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.addEventListener("click", function () { send("contact_phone"); });
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      a.addEventListener("click", function () { send("contact_email"); });
    });
  });
})();
