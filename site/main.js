/**
 * PageNab — Site Animations & Interactive Presets
 * GSAP + ScrollTrigger · Cursor orb · Magnetic buttons · Count-up · Preset tabs
 * NOTE: This file is dynamically injected after window.load, so DOM + GSAP are ready.
 */

(function init() {
  if (typeof gsap === 'undefined') {
    console.warn('[PageNab] GSAP not loaded');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ── CURSOR ORB ─────────────────────────────────────────── */
  const orb = document.querySelector('.cursor-orb');
  if (orb) {
    let orbX = window.innerWidth / 2;
    let orbY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
      orbX = e.clientX;
      orbY = e.clientY;
    });

    gsap.ticker.add(() => {
      gsap.set(orb, { x: orbX, y: orbY });
    });
  }

  /* ── SPLIT TEXT HELPER ──────────────────────────────────── */
  function buildWordChars(text) {
    let out = '';
    const words = text.split(' ');
    words.forEach((word, wi) => {
      if (word.length === 0) return;
      const charSpans = word.split('').map(ch =>
        `<span class="char" aria-hidden="true" style="display:inline-block;will-change:transform,opacity">${ch}</span>`
      ).join('');
      // Wrap word in a no-break container so chars don't split across lines
      out += `<span class="word" style="display:inline-block;white-space:nowrap">${charSpans}</span>`;
      // Add space span between words (not after last)
      if (wi < words.length - 1) {
        out += `<span class="char" aria-hidden="true" style="display:inline-block;will-change:transform,opacity">&nbsp;</span>`;
      }
    });
    return out;
  }

  function splitChars(el) {
    el.setAttribute('aria-label', el.textContent);
    let html = '';
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        html += buildWordChars(node.textContent);
      } else if (node.nodeName === 'BR') {
        html += '<br>';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        html += buildWordChars(node.textContent);
      }
    });
    el.innerHTML = html;
    return el.querySelectorAll('.char');
  }

  /* ── NAV SCROLL BEHAVIOUR ───────────────────────────────── */
  const nav = document.querySelector('.nav');
  if (nav) {
    ScrollTrigger.create({
      start: 80,
      onEnter: () => nav.classList.add('scrolled'),
      onLeaveBack: () => nav.classList.remove('scrolled'),
    });
  }

  /* ── HERO ANIMATION ─────────────────────────────────────── */
  const line1 = document.querySelector('.hero-title-line-1');
  const line2 = document.querySelector('.hero-title-line-2');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (line1) {
    const chars1 = splitChars(line1);
    tl.from(chars1, {
      y: 70,
      opacity: 0,
      rotateX: -50,
      stagger: 0.04,
      duration: 0.85,
    });
  }

  if (line2) {
    tl.from(line2, {
      y: 50,
      opacity: 0,
      duration: 0.9,
      ease: 'back.out(1.3)',
    }, '-=0.55');
  }

  tl.to('.hero-eyebrow',  { opacity: 1, y: 0, duration: 0.6 }, '-=0.7')
    .to('.hero-subtitle', { opacity: 1, y: 0, duration: 0.55 }, '-=0.3')
    .to('.hero-shortcut', { opacity: 1, y: 0, duration: 0.45 }, '-=0.25')
    .to('.hero-actions',  { opacity: 1, y: 0, duration: 0.5 }, '-=0.2')
    .to('.hero-trust',    { opacity: 1, y: 0, duration: 0.45 }, '-=0.25')
    .to('.hero-card',     { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.4')
    .to('.hero-scroll',   { opacity: 1, duration: 0.5 }, '-=0.2');

  /* ── Preset tabs animation (staggered after card appears) ─ */
  tl.from('.preset-tab', {
    opacity: 0,
    y: -8,
    stagger: 0.08,
    duration: 0.35,
    ease: 'power2.out',
  }, '-=0.3');

  /* ── NAV LOGO HOVER ─────────────────────────────────────── */
  const navLogo = document.querySelector('.nav-logo');
  if (navLogo) {
    navLogo.addEventListener('mouseenter', () => {
      gsap.to(navLogo, { scale: 1.04, duration: 0.25, ease: 'power2.out' });
    });
    navLogo.addEventListener('mouseleave', () => {
      gsap.to(navLogo, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    });
  }

  /* ── SECTION HEADING SPLIT REVEALS ─────────────────────── */
  document.querySelectorAll('[data-split]').forEach(el => {
    const chars = splitChars(el);
    gsap.from(chars, {
      y: 60,
      opacity: 0,
      stagger: 0.025,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 82%',
      },
    });
  });

  /* ── GENERIC REVEAL ─────────────────────────────────────── */
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
      delay: el.dataset.delay ? parseFloat(el.dataset.delay) : 0,
    });
  });

  gsap.utils.toArray('.reveal-left').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  gsap.utils.toArray('.reveal-right').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  gsap.utils.toArray('.reveal-scale').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      scale: 1,
      duration: 0.7,
      ease: 'back.out(1.4)',
      scrollTrigger: { trigger: el, start: 'top 87%' },
    });
  });

  /* ── STAGGER GROUPS ─────────────────────────────────────── */
  document.querySelectorAll('[data-stagger]').forEach(group => {
    const children = group.children;
    gsap.from(children, {
      opacity: 0,
      y: 36,
      stagger: 0.1,
      duration: 0.65,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: group,
        start: 'top 82%',
      },
    });
  });

  /* ── HOW STRIP ANIMATION ─────────────────────────────────── */
  gsap.from('.how-step', {
    opacity: 0,
    y: 30,
    stagger: 0.15,
    duration: 0.65,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.how-strip',
      start: 'top 80%',
    },
  });

  gsap.from('.how-arrow', {
    opacity: 0,
    x: -15,
    stagger: 0.15,
    duration: 0.5,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.how-strip',
      start: 'top 80%',
    },
  });

  /* ── STAT CARDS ─────────────────────────────────────────── */
  gsap.from('.stat-card', {
    opacity: 0,
    y: 30,
    scale: 0.95,
    stagger: 0.1,
    duration: 0.6,
    ease: 'back.out(1.5)',
    scrollTrigger: {
      trigger: '.privacy-stats',
      start: 'top 82%',
    },
  });

  /* ── WORKS-WITH STRIP REVEAL ─────────────────────────────── */
  gsap.from('.works-with-strip', {
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.works-with-strip',
      start: 'top 90%',
    },
  });

  /* ── MAGNETIC BUTTONS ───────────────────────────────────── */
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, {
        x: x * 0.28,
        y: y * 0.28,
        duration: 0.35,
        ease: 'power2.out',
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      });
    });
  });

  /* ── COUNT-UP STATS ─────────────────────────────────────── */
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;

    const obj = { val: 0 };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = prefix + obj.val.toFixed(decimals) + suffix;
          },
          onComplete: () => {
            el.textContent = prefix + target + suffix;
          },
        });
      },
    });
  });

  /* ── FAQ ACCORDION ──────────────────────────────────────── */
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('open');
          gsap.to(openItem.querySelector('.faq-answer'), {
            maxHeight: 0,
            duration: 0.15,
            ease: 'power2.in',
          });
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        gsap.to(answer, {
          maxHeight: 0,
          duration: 0.15,
          ease: 'power2.in',
        });
      } else {
        item.classList.add('open');
        gsap.to(answer, {
          maxHeight: answer.scrollHeight + 40,
          duration: 0.2,
          ease: 'power3.out',
        });
      }
    });
  });

  /* ── FAQ ITEMS REVEAL ──────────────────────────────────── */
  gsap.from('.faq-item', {
    opacity: 0,
    y: 20,
    stagger: 0.07,
    duration: 0.5,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.faq-list',
      start: 'top 82%',
    },
  });

  /* ══════════════════════════════════════════════════════════
     CAPTURE ANIMATION — hero card (browser → flash → terminal)
  ═══════════════════════════════════════════════════════ */

  function initCaptureAnimation() {
    const heroCard = document.querySelector('.hero-card');
    if (!heroCard) return;

    const cardLabel    = document.getElementById('hero-card-label');
    const browserPanel = heroCard.querySelector('.hc-browser');
    const flashPanel   = heroCard.querySelector('.hc-flash');
    const terminalPanel = heroCard.querySelector('.hc-terminal');
    const cursor       = heroCard.querySelector('.hc-cursor');
    const extBtn       = heroCard.querySelector('.hc-ext-btn');
    const bars         = browserPanel ? Array.from(browserPanel.querySelectorAll('.hc-bar')) : [];
    const lines        = terminalPanel ? Array.from(terminalPanel.querySelectorAll('.hc-line')) : [];
    const blinkCursor  = terminalPanel ? terminalPanel.querySelector('.hc-blink-cursor') : null;

    if (!browserPanel || !flashPanel || !terminalPanel) return;

    /* ── Set initial state ────────────────────────────────── */
    gsap.set(browserPanel, { opacity: 1 });
    gsap.set([flashPanel, terminalPanel], { opacity: 0 });
    // Cursor starts off-button, above-right — will arc down into position
    gsap.set(cursor, { opacity: 0, x: 30, y: -24 });
    // Bars start at zero height
    gsap.set(bars, { scaleY: 0, transformOrigin: 'bottom center' });
    // Lines hidden with clip — GSAP overrides the CSS opacity: 0
    gsap.set(lines, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
    if (blinkCursor) blinkCursor.classList.remove('active');

    /* ── One animation cycle ──────────────────────────────── */
    function runCycle() {
      const tl = gsap.timeline({
        onComplete: () => gsap.delayedCall(1.2, runCycle),
      });

      // Phase 0 — chart bars grow up ("live" dashboard feel)
      tl.to(bars, {
        scaleY: 1,
        stagger: 0.07,
        duration: 0.4,
        ease: 'power2.out',
      }, 0.3);

      // Phase 1 — cursor arcs in from top-right toward extension button
      tl.to(cursor, { opacity: 1, duration: 0.22, ease: 'power2.out' }, 0.9);
      tl.to(cursor, { x: 15, y: -10, duration: 0.32, ease: 'power1.in'  }, 1.12);
      tl.to(cursor, { x: 0,  y: 0,   duration: 0.3,  ease: 'power3.out' }, 1.44);

      // Phase 2 — card border glow signals capture
      tl.to(heroCard, {
        boxShadow: '0 32px 80px rgba(0,0,0,0.24), 0 0 0 2px rgba(99,102,241,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        duration: 0.14,
      }, 1.7);
      tl.to(heroCard, {
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
        duration: 0.55,
        ease: 'power2.out',
      }, 1.9);

      // Phase 3 — click the PageNab extension button
      if (extBtn) {
        tl.to(extBtn, {
          scale: 0.75,
          boxShadow: '0 0 0 6px rgba(99,102,241,0.45)',
          duration: 0.1,
          ease: 'power3.in',
        }, 1.72);
        tl.to(extBtn, {
          scale: 1,
          boxShadow: '0 0 0 0px rgba(99,102,241,0)',
          duration: 0.48,
          ease: 'back.out(2.8)',
        }, 1.82);
      }

      // Phase 4 — screenshot flash
      tl.to(flashPanel, { opacity: 0.92, duration: 0.1, ease: 'power3.in'  }, 1.75);
      tl.to(flashPanel, { opacity: 0,    duration: 0.65, ease: 'power2.out' }, 1.88);

      // Browser + cursor fade out; label updates
      tl.to(browserPanel, { opacity: 0, duration: 0.32 }, 1.83);
      tl.to(cursor,        { opacity: 0, duration: 0.2  }, 1.83);
      tl.call(() => {
        if (cardLabel) cardLabel.textContent = 'clipboard output';
      }, null, 2.1);

      // Phase 5 — terminal fades in
      tl.to(terminalPanel, { opacity: 1, duration: 0.28, ease: 'power2.out' }, 2.15);

      // Lines wipe left-to-right (typewriter feel via clipPath)
      tl.to(lines, {
        clipPath: 'inset(0 0% 0 0)',
        stagger: { each: 0.09 },
        duration: 0.22,
        ease: 'none',
      }, 2.3);

      // After last line lands: activate blink cursor + flash ✓ Copied
      const linesDone = 2.3 + (lines.length - 1) * 0.09 + 0.22 + 0.2;
      const holdUntil = linesDone + 2.2;

      tl.call(() => {
        if (blinkCursor) blinkCursor.classList.add('active');
        const copyLine = terminalPanel.querySelector('.code-g');
        if (copyLine) {
          copyLine.classList.remove('copy-flash');
          void copyLine.offsetWidth;
          copyLine.classList.add('copy-flash');
        }
      }, null, linesDone);

      // Reset — fade terminal out, deactivate cursor, browser back in
      tl.to(terminalPanel, { opacity: 0, duration: 0.38, ease: 'power2.in'  }, holdUntil);
      tl.call(() => {
        if (blinkCursor) blinkCursor.classList.remove('active');
      }, null, holdUntil);
      tl.to(browserPanel, { opacity: 1, duration: 0.42, ease: 'power2.out' }, holdUntil + 0.28);
      tl.call(() => {
        if (cardLabel) cardLabel.textContent = 'app.example.com/dashboard';
        gsap.set(cursor, { opacity: 0, x: 30, y: -24 });
        gsap.set(lines,  { clipPath: 'inset(0 100% 0 0)' });
        gsap.set(bars,   { scaleY: 0 });
      }, null, holdUntil + 0.7);
    }

    // Start after the hero entrance animation settles (~3.5 s)
    gsap.delayedCall(3.5, runCycle);
  }

  initCaptureAnimation();

  /* ══════════════════════════════════════════════════════════
     INTERACTIVE PRESET CARDS (section)
  ═══════════════════════════════════════════════════════ */

  const presetExOutput = document.getElementById('preset-example-output');
  const presetExLabel = document.getElementById('preset-example-label');
  const presetCards = document.querySelectorAll('.preset-card[data-preset-card]');

  if (presetExOutput && presetExLabel && presetCards.length) {
    const presetLightEx = `<span class="code-h"># Web page capture</span>

<span class="code-k">**URL:**</span> https://app.example.com/dashboard
<span class="code-k">**Title:**</span> Dashboard — MyApp
<span class="code-k">**Time:**</span> 2026-03-01 14:23:45
<span class="code-k">**Viewport:**</span> 1920×1080
<span class="code-k">**Browser:**</span> Chrome 134 (macOS)
<span class="code-k">**Includes:**</span> screenshot, console (errors only), network (failed only)

<span class="code-h">## Console</span>
2 errors, 1 warning
- <span class="code-e">**ERROR**</span> TypeError: Cannot read property 'map' of undefined — Dashboard.tsx:47
- <span class="code-e">**ERROR**</span> GET /api/users 500 (Internal Server Error)

<span class="code-h">## Network</span>
42 requests, 2 failed
- <span class="code-f">**FAIL**</span> GET <span class="code-p">\`/api/users\`</span> → 500 Internal Server Error
- <span class="code-f">**FAIL**</span> GET <span class="code-p">\`/api/stats\`</span> → 403 Forbidden

<span class="code-h">## Screenshot</span>
<span class="code-p">\`~/Downloads/PageNab_dashboard_….png\`</span>

<span class="code-g">Captured by PageNab v1.0.0</span>`;

    const presetFullEx = `<span class="code-h"># Web page capture</span>

<span class="code-k">**URL:**</span> https://app.example.com/dashboard
<span class="code-k">**Title:**</span> Dashboard — MyApp
<span class="code-k">**Time:**</span> 2026-03-01 14:23:45
<span class="code-k">**Viewport:**</span> 1920×1080
<span class="code-k">**Browser:**</span> Chrome 134 (macOS)
<span class="code-k">**Capture mode:**</span> fullpage | Preset: full
<span class="code-k">**Includes:**</span> screenshot, console, network, dom, cookies, storage, perf, interactions

<span class="code-h">## Console</span>
2 errors, 1 warning, 1 debug
- <span class="code-e">**ERROR**</span> TypeError: Cannot read property 'map' of undefined — Dashboard.tsx:47
- <span class="code-e">**ERROR**</span> GET /api/users 500 (Internal Server Error)
- <span class="code-w">**WARN**</span> React: key prop missing — UserList.tsx:12
- <span class="code-c">**DEBUG**</span> [Cache] Hit ratio: 0.82

<span class="code-h">## Network</span>
42 requests, 2 failed
- <span class="code-f">**FAIL**</span> GET <span class="code-p">\`/api/users\`</span> → 500 Internal Server Error
  Response: {"error":"Internal Server Error"}
- <span class="code-f">**FAIL**</span> GET <span class="code-p">\`/api/stats\`</span> → 403 Forbidden

<span class="code-h">## Cookies</span>
<span class="code-p">session_id</span>=<span class="code-w">***</span> | <span class="code-p">theme</span>=dark | <span class="code-p">_ga</span>=GA1.1.123456

<span class="code-h">## Storage</span>
localStorage: 4 keys · sessionStorage: 2 keys
- <span class="code-p">\`theme\`</span> = "dark"
- <span class="code-p">\`api_token\`</span> = <span class="code-w">***</span>
- <span class="code-p">\`user_prefs\`</span> = {"lang":"en"}

<span class="code-h">## Performance</span>
- <span class="code-k">FP:</span> 320ms · <span class="code-k">FCP:</span> 450ms · <span class="code-k">LCP:</span> 1.8s
- <span class="code-k">Load:</span> 2.1s · <span class="code-k">DOMContentLoaded:</span> 0.9s
- <span class="code-k">CLS:</span> 0.04 · <span class="code-k">FID:</span> 12ms · <span class="code-k">Memory:</span> 42MB

<span class="code-h">## Interactions</span>
3 events (most recent first)
- <span class="code-p">click</span> button.submit-btn (14:23:41)
- <span class="code-p">input</span> input#search → <span class="code-w">***</span> (14:23:38)
- <span class="code-p">scroll</span> window ↓340px (14:23:35)

<span class="code-h">## DOM</span> <span class="code-c">(47.2 KB)</span>
<span class="code-p">&lt;main class="dashboard"&gt;</span>
  <span class="code-p">&lt;h1&gt;</span>Dashboard<span class="code-p">&lt;/h1&gt;</span>
  <span class="code-p">&lt;div class="error-panel"&gt;</span>…<span class="code-p">&lt;/div&gt;</span>
<span class="code-p">&lt;/main&gt;</span>

<span class="code-h">## Screenshot</span>
<span class="code-p">\`~/Downloads/PageNab_dashboard_….png\`</span>

<span class="code-g">Captured by PageNab v1.0.0</span>`;

    const presetCustomEx = `<span class="code-h"># Web page capture</span>

<span class="code-k">**URL:**</span> https://app.example.com/dashboard
<span class="code-k">**Title:**</span> Dashboard — MyApp
<span class="code-k">**Time:**</span> 2026-03-01 14:23:45
<span class="code-k">**Viewport:**</span> 1920×1080
<span class="code-k">**Browser:**</span> Chrome 134 (macOS)
<span class="code-k">**Includes:**</span> screenshot, console, network, performance

<span class="code-h">## Console</span> <span class="code-c">← toggled on</span>
2 errors, 1 warning
- <span class="code-e">**ERROR**</span> TypeError: Cannot read property 'map' of undefined — Dashboard.tsx:47
- <span class="code-e">**ERROR**</span> GET /api/users 500 (Internal Server Error)

<span class="code-h">## Network</span> <span class="code-c">← toggled on</span>
42 requests, 2 failed
- <span class="code-f">**FAIL**</span> GET <span class="code-p">\`/api/users\`</span> → 500 Internal Server Error
- <span class="code-f">**FAIL**</span> GET <span class="code-p">\`/api/stats\`</span> → 403 Forbidden

<span class="code-h">## Performance</span> <span class="code-c">← toggled on</span>
- <span class="code-k">FP:</span> 320ms · <span class="code-k">FCP:</span> 450ms · <span class="code-k">LCP:</span> 1.8s
- <span class="code-k">Load:</span> 2.1s · <span class="code-k">DOMContentLoaded:</span> 0.9s
- <span class="code-k">CLS:</span> 0.04 · <span class="code-k">FID:</span> 12ms

<span class="code-c">// DOM, Cookies, Storage, Interactions — toggled off</span>

<span class="code-h">## Screenshot</span>
<span class="code-p">\`~/Downloads/PageNab_dashboard_….png\`</span>

<span class="code-g">Captured by PageNab v1.0.0</span>`;

    const presetExContents = { light: presetLightEx, full: presetFullEx, custom: presetCustomEx };
    const presetExLabels = {
      light: 'Light preset — clipboard output',
      full: 'Full preset — clipboard output',
      custom: 'Custom preset — clipboard output',
    };

    function switchPresetCard(preset) {
      gsap.to(presetExOutput, {
        opacity: 0,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          presetExOutput.innerHTML = presetExContents[preset];
          presetExLabel.textContent = presetExLabels[preset];
          gsap.to(presetExOutput, { opacity: 1, duration: 0.2, ease: 'power2.out' });
        },
      });

      presetCards.forEach(card => {
        const isActive = card.dataset.presetCard === preset;
        card.classList.toggle('active', isActive);
        card.setAttribute('aria-selected', isActive);
      });
    }

    presetCards.forEach(card => {
      card.addEventListener('click', () => switchPresetCard(card.dataset.presetCard));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchPresetCard(card.dataset.presetCard);
        }
      });
    });

    /* ── Preset cards + example reveal ─── */
    gsap.from('.preset-card', {
      opacity: 0,
      y: 30,
      stagger: 0.1,
      duration: 0.65,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.presets-grid',
        start: 'top 82%',
      },
    });

    gsap.from('.preset-example', {
      opacity: 0,
      y: 24,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.preset-example',
        start: 'top 85%',
      },
    });
  }

  console.log('[PageNab] Animations initialised ✓');
})();
