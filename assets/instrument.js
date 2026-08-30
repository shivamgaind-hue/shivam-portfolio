/* ============================================================
   INSTRUMENT — behaviour layer
   No dependencies. Everything degrades without JS.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- 1. Header + drawer ---------------- */
  var hdr = $(".hdr");
  var drawer = $(".drawer");
  var menuBtn = $(".menu-btn");

  if (menuBtn && drawer) {
    menuBtn.addEventListener("click", function () {
      var open = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", String(!open));
      drawer.classList.toggle("open", !open);
    });
    $$("a", drawer).forEach(function (a) {
      a.addEventListener("click", function () {
        menuBtn.setAttribute("aria-expanded", "false");
        drawer.classList.remove("open");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) {
        menuBtn.setAttribute("aria-expanded", "false");
        drawer.classList.remove("open");
        menuBtn.focus();
      }
    });
  }

  /* ---------------- 2. Scroll-driven chrome ---------------- */
  var field = $(".field");
  var progress = $(".progress");
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (hdr) hdr.classList.toggle("stuck", y > 24);
    if (field && !reduced) field.style.transform = "translate3d(0," + (-y * 0.055).toFixed(2) + "px,0)";
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + "%";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------------- 3. Reveal on enter ---------------- */
  var rvs = $$(".rv");
  if ("IntersectionObserver" in window && rvs.length) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    rvs.forEach(function (n) { ro.observe(n); });
  } else {
    rvs.forEach(function (n) { n.classList.add("in"); });
  }

  /* ---------------- 4. Section spy (nav + rail) ---------------- */
  var spyTargets = $$("main section[id]");
  var spyLinks = $$('.nav a[href^="#"], .rail a[href^="#"]');
  if (spyTargets.length && spyLinks.length && "IntersectionObserver" in window) {
    var current = "";
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) current = e.target.id;
      });
      spyLinks.forEach(function (a) {
        a.classList.toggle("on", a.getAttribute("href") === "#" + current);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    spyTargets.forEach(function (s) { so.observe(s); });
  }

  /* ---------------- 5. Hero oscilloscope ---------------- */
  var scope = $(".scope canvas");
  if (scope) {
    var ctx = scope.getContext("2d", { alpha: true });
    var W = 0, H = 0, dpr = 1;
    var t = 0;
    var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    function resize() {
      var r = scope.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      scope.width = W * dpr;
      scope.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function graticule() {
      var step = Math.max(48, Math.min(96, W / 16));
      ctx.save();
      ctx.strokeStyle = "rgba(126,168,178,0.085)";
      ctx.lineWidth = 1;
      for (var x = (W / 2) % step; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
      }
      for (var y = (H / 2) % step; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
      }
      /* centre axes, brighter */
      ctx.strokeStyle = "rgba(126,168,178,0.2)";
      ctx.beginPath(); ctx.moveTo(0, Math.round(H * 0.5) + 0.5); ctx.lineTo(W, Math.round(H * 0.5) + 0.5); ctx.stroke();
      ctx.restore();
    }

    /* three-phase set + a dq-style envelope */
    var phases = [
      { off: 0,               col: "62,224,189",  amp: 1.00 },
      { off: (2 * Math.PI) / 3, col: "255,179,71", amp: 0.92 },
      { off: (4 * Math.PI) / 3, col: "155,140,255", amp: 0.92 }
    ];

    function trace(now) {
      ctx.clearRect(0, 0, W, H);
      graticule();

      var midY = H * 0.5;
      var amp = Math.min(H * 0.19, 150);
      var cyclesAcross = 2.1 + pointer.x * 1.5;      /* horizontal "time base" follows pointer */
      var modDepth = 0.22 + (1 - pointer.y) * 0.28;  /* vertical position modulates the envelope */

      phases.forEach(function (p, i) {
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        /* glow pass */
        for (var pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(" + p.col + "," + (pass === 0 ? 0.10 : 0.72) + ")";
          ctx.lineWidth = pass === 0 ? 7 : 1.35;
          if (pass === 0) { ctx.filter = "blur(3px)"; } else { ctx.filter = "none"; }
          for (var px = 0; px <= W; px += 2) {
            var u = px / W;
            var env = 1 + modDepth * Math.sin(u * Math.PI * 1.2 + now * 0.00042 + i);
            var v = Math.sin(u * Math.PI * 2 * cyclesAcross - now * 0.00115 + p.off);
            /* light third-harmonic injection — reads as a real drive waveform */
            var v3 = 0.14 * Math.sin(3 * (u * Math.PI * 2 * cyclesAcross - now * 0.00115) + p.off);
            var y = midY + (v + v3) * amp * p.amp * env * (1 - i * 0.06);
            if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
          }
          ctx.stroke();
        }
        ctx.filter = "none";
        ctx.restore();
      });

      /* sweeping beam head on channel 1 */
      var sweep = ((now * 0.00016) % 1);
      var sx = sweep * W;
      var su = sx / W;
      var senv = 1 + modDepth * Math.sin(su * Math.PI * 1.2 + now * 0.00042);
      var sv = Math.sin(su * Math.PI * 2 * cyclesAcross - now * 0.00115)
             + 0.14 * Math.sin(3 * (su * Math.PI * 2 * cyclesAcross - now * 0.00115));
      var sy = midY + sv * amp * senv;

      ctx.save();
      var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
      g.addColorStop(0, "rgba(125,245,218,0.9)");
      g.addColorStop(1, "rgba(62,224,189,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(220,255,248,0.95)";
      ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
      /* cursor line */
      ctx.strokeStyle = "rgba(62,224,189,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx + 0.5, 0); ctx.lineTo(sx + 0.5, H); ctx.stroke();
      ctx.restore();
    }

    function frame(now) {
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      trace(now);
      t = window.requestAnimationFrame(frame);
    }

    window.addEventListener("resize", function () { resize(); if (reduced) trace(1200); }, { passive: true });
    window.addEventListener("pointermove", function (e) {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    }, { passive: true });

    resize();
    if (reduced) {
      trace(1200);
    } else {
      var running = true;
      t = window.requestAnimationFrame(frame);
      /* pause when hero is off-screen — saves battery, keeps scrolling smooth */
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !running) { running = true; t = window.requestAnimationFrame(frame); }
            else if (!e.isIntersecting && running) { running = false; window.cancelAnimationFrame(t); }
          });
        }, { threshold: 0 }).observe(scope.parentElement);
      }
    }
  }

  /* ---------------- 6. Hero entrance ---------------- */
  var hero = $(".hero");
  if (hero) { window.requestAnimationFrame(function () { hero.classList.add("lit"); }); }

  /* ---------------- 7. Timeline: scroll-linked horizontal trace ---------------- */
  var tl = $(".tl-shell");
  if (tl) {
    var rail = $(".tl-rail", tl);
    var viewport = $(".tl-viewport", tl);
    var prog = $(".tl-axis .prog", tl);
    var wide = window.matchMedia("(min-width: 960px)");

    function overflowAmount() { return Math.max(0, rail.scrollWidth - viewport.clientWidth); }

    function setup() {
      if (wide.matches && !reduced) {
        tl.style.height = (window.innerHeight + overflowAmount() * 0.85) + "px";
        tl.classList.add("pinned");
        viewport.style.position = "sticky";
        viewport.style.top = "var(--hdr-h)";
        viewport.style.overflow = "hidden";
        viewport.style.minHeight = "calc(100vh - var(--hdr-h))";
        viewport.style.display = "flex";
        viewport.style.flexDirection = "column";
        viewport.style.justifyContent = "center";
      } else {
        tl.style.height = "";
        tl.classList.remove("pinned");
        viewport.style.position = "";
        viewport.style.top = "";
        viewport.style.minHeight = "";
        viewport.style.display = "";
        viewport.style.flexDirection = "";
        viewport.style.justifyContent = "";
        viewport.style.overflowX = "auto";
        rail.style.transform = "";
        if (prog) prog.style.width = "0%";
      }
    }

    function move() {
      if (!tl.classList.contains("pinned")) return;
      var r = tl.getBoundingClientRect();
      var total = tl.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      rail.style.transform = "translate3d(" + (-p * overflowAmount()).toFixed(1) + "px,0,0)";
      if (prog) prog.style.width = (p * 100).toFixed(1) + "%";
    }

    var tlTick = false;
    window.addEventListener("scroll", function () {
      if (!tlTick) { tlTick = true; window.requestAnimationFrame(function () { move(); tlTick = false; }); }
    }, { passive: true });
    window.addEventListener("resize", function () { setup(); move(); }, { passive: true });
    setup(); move();
  }

  /* ---------------- 8. Lightbox ---------------- */
  var lb = $(".lb");
  if (lb) {
    var stage = $(".lb-stage", lb);
    var capEl = $(".lb-cap", lb);
    var countEl = $(".lb-count", lb);
    var group = [];
    var at = 0;
    var opener = null;

    function render() {
      var it = group[at];
      if (!it) return;
      stage.innerHTML = "";
      var node;
      if (it.type === "video") {
        node = document.createElement("video");
        node.src = it.src; node.controls = true; node.playsInline = true; node.autoplay = true;
        if (it.poster) node.poster = it.poster;
      } else {
        node = document.createElement("img");
        node.src = it.src; node.alt = it.alt || "";
      }
      stage.appendChild(node);
      capEl.innerHTML = (it.label ? "<b>" + it.label + "</b>" : "") + (it.alt || "");
      countEl.textContent = (at + 1) + " / " + group.length;
      $(".lb-nav", lb).hidden = group.length < 2;
    }

    function open(list, i, from) {
      group = list; at = i; opener = from || null;
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      render();
      $(".lb-close", lb).focus();
    }
    function close() {
      lb.hidden = true; stage.innerHTML = "";
      document.body.style.overflow = "";
      if (opener) opener.focus();
    }
    function step(d) { at = (at + d + group.length) % group.length; render(); }

    $(".lb-close", lb).addEventListener("click", close);
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target === stage) close(); });
    var prevB = $(".lb-prev", lb), nextB = $(".lb-next", lb);
    if (prevB) prevB.addEventListener("click", function () { step(-1); });
    if (nextB) nextB.addEventListener("click", function () { step(1); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    $$("[data-gallery]").forEach(function (g) {
      var items = $$("[data-lb]", g).map(function (b) {
        return {
          src: b.getAttribute("data-lb"),
          type: b.getAttribute("data-lb-type") || "image",
          poster: b.getAttribute("data-lb-poster") || "",
          alt: b.getAttribute("data-lb-alt") || "",
          label: b.getAttribute("data-lb-label") || ""
        };
      });
      $$("[data-lb]", g).forEach(function (b, i) {
        b.addEventListener("click", function () { open(items, i, b); });
      });
    });
  }

  /* ---------------- 9. Slide deck viewer ---------------- */
  $$("[data-deck]").forEach(function (deck) {
    var img = $(".deck-stage img", deck);
    var strip = $(".deck-strip", deck);
    var count = $(".deck-count", deck);
    var prevB = $(".deck-prev", deck);
    var nextB = $(".deck-next", deck);
    var thumbs = $$("button", strip);
    var n = thumbs.length;
    var i = 0;

    function show(k) {
      i = Math.min(n - 1, Math.max(0, k));
      var b = thumbs[i];
      img.src = b.getAttribute("data-full");
      img.alt = "Slide " + (i + 1) + " of " + n + " — " + deck.getAttribute("data-deck");
      count.textContent = String(i + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0");
      thumbs.forEach(function (x, j) { x.setAttribute("aria-current", String(j === i)); });
      prevB.disabled = i === 0;
      nextB.disabled = i === n - 1;
      b.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
    }
    thumbs.forEach(function (b, j) { b.addEventListener("click", function () { show(j); }); });
    prevB.addEventListener("click", function () { show(i - 1); });
    nextB.addEventListener("click", function () { show(i + 1); });
    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { show(i - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { show(i + 1); e.preventDefault(); }
    });
    show(0);
  });

  /* ---------------- 10. Project index filters ---------------- */
  var filters = $(".filters");
  if (filters) {
    var rows = $$("[data-cat]");
    $$("button", filters).forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        $$("button", filters).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var shown = 0;
        rows.forEach(function (r) {
          var ok = f === "all" || r.getAttribute("data-cat").split(" ").indexOf(f) > -1;
          r.hidden = !ok;
          if (ok) { shown++; r.querySelector(".n").textContent = String(shown).padStart(2, "0"); }
        });
        var live = $("#filter-status");
        if (live) live.textContent = shown + " project" + (shown === 1 ? "" : "s") + " shown.";
      });
    });
  }

  /* ---------------- 11. Video: play on demand only ---------------- */
  $$("video[data-lazy]").forEach(function (v) {
    v.addEventListener("play", function () { v.removeAttribute("data-lazy"); }, { once: true });
  });
})();
