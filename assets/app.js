/* ============================================================
   STUDIOS — app.js
   Tracking + lead pipeline preserved verbatim from the previous
   build (CRM webhook, Formspree backup, Meta CAPI ids, beacons).
   Do not edit the tracking blocks without checking the CRM.
   ============================================================ */
(function () {
  "use strict";

  // === UTM CAPTURE (runs on page load, survives session) ===
  (function captureUtm() {
    const KEYS = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ];
    const params = new URLSearchParams(window.location.search);
    const stored = {};
    let found = false;
    KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) {
        stored[k] = v;
        found = true;
      }
    });
    if (found) sessionStorage.setItem("lead_utm", JSON.stringify(stored));
  })();

  function getUtm() {
    try {
      return JSON.parse(sessionStorage.getItem("lead_utm") || "{}");
    } catch {
      return {};
    }
  }

  // Reads a single cookie value by name (used for the Meta _fbc / _fbp
  // click/browser ids that boost Conversions API Match Quality).
  function getCookie(name) {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    return match ? match[2] : null;
  }

  // === STUDIOS CRM ANALYTICS BEACONS ===
  // Full side-channel telemetry: page_view, scroll_depth, form_start,
  // form_abandon, heartbeat. Does NOT touch the lead-form submission to
  // the CRM / Make / Formspree above. Same PUBLIC secret as the leads
  // webhook (ships in client JS regardless; string-split deters scraping).
  const WEBHOOK_SECRET =
    "84373481945a8a0b8c3" + "18e4c3241f49d709b6bb6fec7ad9680a71f18fb75e8cf";
  const TRACK_URL =
    "https://studios-hub.vercel.app/api/track?secret=" + WEBHOOK_SECRET;

  function shSessionId() {
    try {
      let sid = sessionStorage.getItem("sh_session_id");
      if (!sid) {
        sid =
          window.crypto && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2);
        sessionStorage.setItem("sh_session_id", sid);
      }
      return sid;
    } catch (e) {
      return null;
    }
  }

  function shDevice() {
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
    return "desktop";
  }

  function shTrack(eventType, label) {
    try {
      const utm = typeof getUtm === "function" ? getUtm() : {};
      const body = JSON.stringify({
        event_type: eventType,
        label:
          label !== undefined && label !== null ? String(label) : undefined,
        session_id: shSessionId(),
        page_path: location.pathname,
        referrer: document.referrer || undefined,
        device: shDevice(),
        utm_source: utm.utm_source || undefined,
        utm_medium: utm.utm_medium || undefined,
        utm_campaign: utm.utm_campaign || undefined,
        utm_content: utm.utm_content || undefined,
        utm_term: utm.utm_term || undefined,
      });
      fetch(TRACK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  // 1) Page entry
  shTrack("page_view");

  // 2) Scroll depth — 25/50/75/100%
  (function () {
    var thresholds = [25, 50, 75, 100],
      fired = {};
    function onScroll() {
      var el = document.documentElement;
      var max = el.scrollHeight - el.clientHeight || 1;
      var pct = Math.min(
        100,
        Math.round(((el.scrollTop || document.body.scrollTop) / max) * 100),
      );
      thresholds.forEach(function (t) {
        if (pct >= t && !fired[t]) {
          fired[t] = true;
          shTrack("scroll_depth", t);
        }
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  // 3) Form — start + abandon
  (function () {
    var mainForm = document.querySelector("#contactForm");
    if (!mainForm) return;
    var started = false,
      done = false,
      lastField = null;
    mainForm.addEventListener("focusin", function (e) {
      var el = e.target;
      if (el) lastField = el.name || el.id || el.type || "field";
      if (!started) {
        started = true;
        shTrack("form_start");
      }
    });
    mainForm.addEventListener("submit", function () {
      done = true;
    });
    function abandon() {
      if (started && !done && lastField) {
        done = true;
        shTrack("form_abandon", lastField);
      }
    }
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") abandon();
    });
    window.addEventListener("pagehide", abandon);
  })();

  // 4) Real-time heartbeat — by quarter (1=top .. 4=bottom)
  (function () {
    function quarter() {
      var el = document.documentElement;
      var max = el.scrollHeight - el.clientHeight || 1;
      var pct = (el.scrollTop || document.body.scrollTop) / max;
      return String(Math.min(4, Math.floor(pct * 4) + 1));
    }
    function beat() {
      if (document.visibilityState !== "hidden")
        shTrack("heartbeat", quarter());
    }
    beat();
    setInterval(beat, 15000);
  })();

  // 5) Booking clicks — the calendar is a lead path of its own, so it gets
  // the same treatment as the form. Delegated, so it covers the links in the
  // footer, the mobile sheet, the CTA bands and the thank-you page alike.
  document.addEventListener("click", function (e) {
    var a =
      e.target && e.target.closest
        ? e.target.closest('a[href*="calendar.app.google"]')
        : null;
    if (!a) return;
    // "booking_click" is added to the CRM's event_type enum by migration
    // 20260819200000_landing_events_booking_click.sql. Until that migration is
    // run and the CRM redeployed, /api/track answers 400 — which is harmless
    // here (fetch resolves, nothing is surfaced) and starts recording by itself
    // the moment the CRM ships. No second change needed on this side.
    shTrack("booking_click", location.pathname);
    if (typeof fbq !== "undefined")
      fbq("track", "Contact", {
        content_name: "Booking Click",
        content_category: "contact",
      });
  });

  /* ---------- UI ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    // === FORM SUBMIT + REDIRECT ===
    // Guarded: sub-pages have no contact form.
    var __cf = document.getElementById("contactForm");
    if (__cf)
      __cf.addEventListener("submit", function (e) {
        e.preventDefault();
        const form = this;
        const btn = form.querySelector(".form-btn");
        const origBtn = btn.innerHTML;
        btn.innerHTML = "שולח...";
        btn.disabled = true;
        const fd = new FormData(form);
        const name = fd.get("name") || "";
        const phone = fd.get("phone") || "";
        const email = fd.get("email") || null;
        const message = fd.get("message") || null;
        const utm = getUtm();
        // WhatsApp opt-in. The wording is read off the page rather than
        // hardcoded here, so the proof we store is literally what was on
        // screen — a copy edit to the label can never silently desync from
        // the consent record it is supposed to evidence.
        const waBox = form.querySelector("#f-wa");
        const waConsent = !!(waBox && waBox.checked);
        const waConsentText = waConsent
          ? (document.getElementById("f-wa-text") || {}).textContent || undefined
          : undefined;
        // Meta click/browser ids for Conversions API Match Quality.
        // _fbp/_fbc are set by the Pixel; if the visitor submits within
        // seconds of landing the Pixel may not have written _fbc yet, so
        // we reconstruct it from the fbclid URL param in Meta's official
        // format: fb.1.<timestamp>.<fbclid>. Absent entirely (no ad click)
        // is fine — we just send undefined.
        let fbc = getCookie("_fbc");
        const fbp = getCookie("_fbp");
        if (!fbc) {
          const fbclid = new URLSearchParams(window.location.search).get(
            "fbclid",
          );
          if (fbclid) fbc = "fb.1." + Date.now() + "." + fbclid;
        }
        // Studios CRM webhook (replaces direct Supabase RPC).
        // NOTE: this secret is PUBLIC — it ships in client JS and is visible
        // via view-source, so the string-splitting below hides nothing. It
        // only deters trivial scraping; the webhook RPC dedupes by phone.
        // Rotate LEADS_WEBHOOK_SECRET server-side if abuse appears.
        const supaReq = fetch(
          "https://studios-hub.vercel.app/api/leads/webhook?secret=" +
            "84373481945a8a0b8c3" +
            "18e4c3241f49d709b6bb6fec7ad9680a71f18fb75e8cf",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              full_name: name,
              phone: phone,
              email: email || undefined,
              initial_message: message || undefined,
              source: "fb_ads",
              campaign_name: utm.utm_campaign || "פייסבוק - מאי 2026",
              created_via: "landing_page",
              utm_source: utm.utm_source || undefined,
              utm_medium: utm.utm_medium || undefined,
              utm_campaign: utm.utm_campaign || undefined,
              utm_content: utm.utm_content || undefined,
              utm_term: utm.utm_term || undefined,
              fbc: fbc || undefined,
              fbp: fbp || undefined,
              wa_consent: waConsent,
              wa_consent_text: waConsentText,
            }),
          },
        ).catch(() => null);
        // Independent EMAIL BACKUP — fire-and-forget. Deliberately NOT part of
        // the delivery gate below, so it can never fake a "thank-you" on its own.
        // Guarantees the lead still reaches Alon by email even if the CRM webhook
        // is momentarily down (the CRM is otherwise a single point of failure).
        // Replaces the old Make.com hook, whose URL was dead (404).
        fetch("https://formspree.io/f/mqegqozk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          keepalive: true,
          body: JSON.stringify({
            name: name,
            phone: phone,
            email: email || "",
            message: message || "",
            source: "landing_page",
            _subject: "ליד חדש מדף הנחיתה (גיבוי) — " + (name || ""),
          }),
        }).catch(() => {});
        // The thank-you redirect is gated ONLY on the CRM webhook (the system
        // of record). fetch() rejects only on a network failure — NOT on HTTP
        // errors (401 expired secret, 500, …) — so a failed CRM call resolves
        // to null (its .catch) or a Response with res.ok=false, and we show the
        // error + WhatsApp fallback instead of faking success. The CRM webhook
        // returns permissive CORS, so res.ok is readable cross-origin. The
        // Formspree email above is a fire-and-forget backup, intentionally
        // excluded from this gate so it can never mask a CRM failure.
        function showFormError() {
          btn.innerHTML = origBtn;
          btn.disabled = false;
          let err = form.querySelector(".form-err");
          if (!err) {
            err = document.createElement("p");
            err.className = "form-err";
            err.setAttribute("role", "alert");
            err.innerHTML =
              "השליחה נכשלה. דברו איתנו ישירות ב" +
              '<a href="https://wa.me/972587879796" target="_blank" rel="noopener">וואטסאפ</a>' +
              " או נסו שוב.";
            btn.parentNode.insertBefore(err, btn.nextSibling);
          }
        }
        Promise.all([supaReq])
          .then((results) => {
            const res = results[0];
            if (!res || !res.ok) {
              showFormError();
              return;
            }
            // Lead saved. Read lead_id + is_duplicate from the webhook response.
            // Fire the Pixel Lead event ONLY for a genuinely NEW lead, with
            // event_id = lead UUID so it dedups against the server-side
            // Conversions API event (which uses the same id and also skips
            // duplicates). Never fires on a failed save, a mere field-touch,
            // or a duplicate submission of the same person.
            return res
              .json()
              .catch(() => null)
              .then((data) => {
                const result = data && data.result ? data.result : {};
                const leadId = result.lead_id || null;
                const isDuplicate = result.is_duplicate === true;
                if (!isDuplicate && typeof fbq !== "undefined") {
                  fbq("init", "3078561329005345", {
                    em: email || "",
                    ph: phone || "",
                    fn: name.split(" ")[0] || "",
                    ln: name.split(" ").slice(1).join(" ") || "",
                    country: "il",
                  });
                  fbq(
                    "track",
                    "Lead",
                    {
                      content_name: "Landing Page Lead Form",
                      content_category: "lead_form",
                      value: 0,
                      currency: "ILS",
                    },
                    leadId ? { eventID: leadId } : undefined,
                  );
                }
                window.location.href = "thank-you.html";
              });
          })
          .catch(showFormError);
      });

    // === FACEBOOK PIXEL — WHATSAPP + PHONE + SCROLL + TIME ===
    // WhatsApp clicks
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (el) {
      el.addEventListener("click", function () {
        if (typeof fbq !== "undefined")
          fbq("track", "Contact", {
            content_name: "WhatsApp Click",
            content_category: "contact",
          });
      });
    });
    // Phone clicks
    document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
      el.addEventListener("click", function () {
        if (typeof fbq !== "undefined")
          fbq("track", "Contact", {
            content_name: "Phone Click",
            content_category: "contact",
          });
      });
    });
    // Scroll depth
    (function () {
      var s50 = false,
        s75 = false;
      window.addEventListener("scroll", function () {
        var p =
          ((window.scrollY + window.innerHeight) / document.body.scrollHeight) *
          100;
        if (p >= 50 && !s50) {
          s50 = true;
          if (typeof fbq !== "undefined")
            fbq("trackCustom", "ScrollDepth", { depth: "50%" });
        }
        if (p >= 75 && !s75) {
          s75 = true;
          if (typeof fbq !== "undefined")
            fbq("trackCustom", "ScrollDepth", { depth: "75%" });
        }
      });
    })();
    // Time on page
    setTimeout(function () {
      if (typeof fbq !== "undefined")
        fbq("trackCustom", "TimeOnPage", { seconds: 30 });
    }, 30000);
    setTimeout(function () {
      if (typeof fbq !== "undefined")
        fbq("trackCustom", "TimeOnPage", { seconds: 60 });
    }, 60000);

    // === FLOATING CTA ===
    (function () {
      const fc = document.getElementById("floatCta");
      const showFrom = document.getElementById("testimonials");
      const hideAt = document.getElementById("contact");
      if (!fc || !showFrom || !hideAt) return;
      window.addEventListener(
        "scroll",
        () => {
          const y = scrollY + innerHeight;
          const show = showFrom.offsetTop;
          const hide = hideAt.offsetTop;
          fc.classList.toggle("visible", scrollY > show && y < hide + 200);
        },
        { passive: true },
      );
    })();

    /* ========================================================
       NEW UI LAYER — header, sheet, reveals, rail, counters
       ======================================================== */

    /* --- Header: solid after first scroll --- */
    (function () {
      var hdr = document.querySelector(".hdr");
      if (!hdr) return;
      var tick = function () {
        hdr.classList.toggle("stuck", window.scrollY > 12);
      };
      tick();
      window.addEventListener("scroll", tick, { passive: true });
    })();

    /* --- Mobile sheet --- */
    (function () {
      var sheet = document.getElementById("sheet");
      var open = document.getElementById("burger");
      var close = document.getElementById("sheetClose");
      if (!sheet || !open) return;
      var setOpen = function (v) {
        sheet.classList.toggle("open", v);
        document.body.style.overflow = v ? "hidden" : "";
        open.setAttribute("aria-expanded", v ? "true" : "false");
      };
      open.addEventListener("click", function () {
        setOpen(!sheet.classList.contains("open"));
      });
      if (close)
        close.addEventListener("click", function () {
          setOpen(false);
        });
      sheet.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          setOpen(false);
        });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setOpen(false);
      });
    })();

    /* --- Reveal on scroll (IntersectionObserver, no GSAP dependency) --- */
    (function () {
      var els = document.querySelectorAll(".rv");
      if (!els.length) return;
      if (!("IntersectionObserver" in window)) {
        els.forEach(function (el) {
          el.classList.add("in");
        });
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("in");
              io.unobserve(en.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      els.forEach(function (el) {
        io.observe(el);
      });

      // Safety net: whatever happens, nothing stays invisible.
      setTimeout(function () {
        document.querySelectorAll(".rv:not(.in)").forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 1.5) el.classList.add("in");
        });
      }, 2500);
    })();

    /* --- Journey / process rail: light each step as it enters --- */
    (function () {
      var steps = document.querySelectorAll(".step");
      if (!steps.length || !("IntersectionObserver" in window)) {
        steps.forEach(function (s) {
          s.classList.add("on");
        });
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) en.target.classList.add("on");
          });
        },
        { rootMargin: "-18% 0px -38% 0px" },
      );
      steps.forEach(function (s) {
        io.observe(s);
      });
    })();

    /* --- Counters: animate numbers once, respect reduced motion --- */
    (function () {
      var nodes = document.querySelectorAll("[data-count]");
      if (!nodes.length) return;
      var reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      var fmt = function (n, node) {
        var dec = parseInt(node.getAttribute("data-dec") || "0", 10);
        var v = dec ? n.toFixed(dec) : Math.round(n).toString();
        if (node.hasAttribute("data-comma"))
          v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return (
          (node.getAttribute("data-pre") || "") +
          v +
          (node.getAttribute("data-suf") || "")
        );
      };
      var run = function (node) {
        var target = parseFloat(node.getAttribute("data-count"));
        if (reduce) {
          node.textContent = fmt(target, node);
          return;
        }
        var dur = 1100,
          t0 = null;
        var frame = function (t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          node.textContent = fmt(target * eased, node);
          if (p < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      };
      if (!("IntersectionObserver" in window)) {
        nodes.forEach(run);
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              run(en.target);
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.4 },
      );
      nodes.forEach(function (n) {
        io.observe(n);
      });
    })();

    /* --- Sky parallax: real media plates driven by scroll --- */
    (function () {
      var groups = [].slice.call(document.querySelectorAll(".sky"));
      if (!groups.length) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      var RATE = { far: 0.1, mid: 0.26, near: 0.46, bleed: 0.14 };
      var SCALE = { far: 1.0, mid: 1.02, near: 1.05, bleed: 1.0 };
      var ticking = false;

      function layersOf(g) {
        return [].slice.call(g.querySelectorAll(".sky-l")).map(function (el) {
          var kind = "far";
          ["mid", "near", "bleed"].forEach(function (k) {
            if (el.classList.contains("sky-" + k)) kind = k;
          });
          return { el: el, rate: RATE[kind], scale: SCALE[kind] };
        });
      }

      var scenes = groups.map(function (g) {
        return { host: g.parentElement || g, layers: layersOf(g) };
      });

      function frame() {
        ticking = false;
        var vh = window.innerHeight;
        scenes.forEach(function (sc) {
          var r = sc.host.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          // progress: 0 when the scene top hits the viewport top, grows as we pass
          var p = -r.top;
          sc.layers.forEach(function (L) {
            L.el.style.setProperty("--y", (p * L.rate).toFixed(1) + "px");
            L.el.style.setProperty("--s", L.scale);
          });
        });
      }

      function onScroll() {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(frame);
        }
      }

      frame();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
    })();

    /* --- Current page marker in nav --- */
    (function () {
      var here =
        location.pathname.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
      document.querySelectorAll(".nav a, .sheet nav a").forEach(function (a) {
        var href = (a.getAttribute("href") || "").split("#")[0];
        if (!href || href.charAt(0) === "#") return;
        var p = href.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
        if (p === here) a.setAttribute("aria-current", "page");
      });
    })();
  });
})();
