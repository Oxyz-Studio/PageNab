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
  function splitChars(el) {
    el.setAttribute('aria-label', el.textContent);
    let html = '';
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        html += node.textContent.split('').map(ch =>
          `<span class="char" aria-hidden="true" style="display:inline-block;will-change:transform,opacity">${
            ch === ' ' ? '&nbsp;' : ch
          }</span>`
        ).join('');
      } else if (node.nodeName === 'BR') {
        html += '<br>';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        html += node.textContent.split('').map(ch =>
          `<span class="char" aria-hidden="true" style="display:inline-block;will-change:transform,opacity">${
            ch === ' ' ? '&nbsp;' : ch
          }</span>`
        ).join('');
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
  const line1    = document.querySelector('.hero-title-line-1');
  const nabBlock = document.querySelector('.hero-nab-block');
  const nabArrow = document.querySelector('.hero-nab-arrow');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (line1) {
    const chars1 = splitChars(line1);
    tl.from(chars1, {
      y: 90,
      opacity: 0,
      rotateX: -60,
      stagger: 0.045,
      duration: 0.9,
    });
  }

  if (nabBlock) {
    tl.from(nabBlock, {
      x: 100,
      opacity: 0,
      rotate: -22,
      transformOrigin: 'left bottom',
      duration: 1.1,
      ease: 'back.out(1.4)',
    }, '-=0.5');
  }

  if (nabArrow) {
    gsap.set(nabArrow, { opacity: 0, scale: 0, rotate: -90, transformOrigin: '50% 50%' });

    tl.to(nabArrow, {
      opacity: 1,
      scale: 1,
      rotate: 0,
      duration: 0.65,
      ease: 'back.out(2.8)',
      transformOrigin: '50% 50%',
    }, '-=0.15');

    tl.add(() => {
      gsap.to(nabArrow, {
        y: -9,
        duration: 1.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
      gsap.to(nabArrow, {
        rotate: 8,
        duration: 2.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    });
  }

  tl.to('.hero-eyebrow',  { opacity: 1, y: 0, duration: 0.6 }, '-=1.0')
    .to('.hero-subtitle', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .to('.hero-actions',  { opacity: 1, y: 0, duration: 0.5 }, '-=0.35')
    .to('.hero-trust',    { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
    .to('.hero-card',     { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5')
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
            duration: 0.3,
            ease: 'power2.in',
          });
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        gsap.to(answer, {
          maxHeight: 0,
          duration: 0.35,
          ease: 'power2.in',
        });
      } else {
        item.classList.add('open');
        gsap.to(answer, {
          maxHeight: answer.scrollHeight + 40,
          duration: 0.5,
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
     INTERACTIVE PRESET TABS
  ═══════════════════════════════════════════════════════ */

  const presetOutput = document.getElementById('preset-output');
  const presetTokens = document.getElementById('preset-tokens');
  const customToggles = document.getElementById('custom-toggles');
  const presetTabs = document.querySelectorAll('.preset-tab');

  if (!presetOutput || !presetTokens || !customToggles) {
    console.log('[PageNab] Animations initialised (no preset card) ✓');
    return;
  }

  /* ── PRESET CONTENT TEMPLATES ───────────────────────────── */
  const metadataBlock = `<span class="code-h"># Web page capture</span>

<span class="code-k">**URL:**</span> https://app.example.com/dashboard
<span class="code-k">**Title:**</span> Dashboard — MyApp
<span class="code-k">**Time:**</span> 2026-03-01 14:23:45
<span class="code-k">**Viewport:**</span> 1920×1080`;

  const consoleBlock = `

<span class="code-h">## Console</span>
2 errors, 1 warning
- <span class="code-e">**ERROR**</span> TypeError: Cannot read property 'map' of undefined — Dashboard.tsx:47
- <span class="code-e">**ERROR**</span> GET /api/users 500 (Internal Server Error)`;

  const networkBlock = `

<span class="code-h">## Network</span>
42 requests, 2 failed
- <span class="code-f">**FAIL**</span> <span class="code-p">\`/api/users\`</span> → 500 Internal Server Error
- <span class="code-f">**FAIL**</span> <span class="code-p">\`/api/stats\`</span> → 403 Forbidden`;

  const cookiesBlock = `

<span class="code-h">## Cookies</span>
8 cookies (sensitive values masked)
- <span class="code-p">\`_ga\`</span> = GA1.1.123456
- <span class="code-p">\`session_id\`</span> = <span class="code-w">***</span>
- <span class="code-p">\`auth_token\`</span> = <span class="code-w">***</span>`;

  const storageBlock = `

<span class="code-h">## Storage</span>
localStorage: 4 keys · sessionStorage: 2 keys
- <span class="code-p">\`theme\`</span> = "dark"
- <span class="code-p">\`api_token\`</span> = <span class="code-w">***</span>
- <span class="code-p">\`user_prefs\`</span> = {"lang":"en"}`;

  const perfBlock = `

<span class="code-h">## Performance</span>
- <span class="code-k">LCP:</span> 1.8s · <span class="code-k">CLS:</span> 0.04 · <span class="code-k">FID:</span> 12ms
- <span class="code-k">Load:</span> 2.1s · <span class="code-k">DOMContentLoaded:</span> 0.9s
- <span class="code-k">Memory:</span> 42MB used`;

  const interactionsBlock = `

<span class="code-h">## Interactions</span>
Last 5 events
- <span class="code-p">click</span> button.submit-btn (14:23:41)
- <span class="code-p">input</span> input#search → <span class="code-w">***</span> (14:23:38)
- <span class="code-p">scroll</span> window ↓340px (14:23:35)`;

  const domBlock = `

<span class="code-h">## DOM</span>
<span class="code-c">&lt;!-- 2,847 chars, scripts removed --&gt;</span>
<span class="code-p">&lt;main class="dashboard"&gt;</span>
  <span class="code-p">&lt;h1&gt;</span>Dashboard<span class="code-p">&lt;/h1&gt;</span>
  <span class="code-p">&lt;div class="error-panel"&gt;</span>…<span class="code-p">&lt;/div&gt;</span>
<span class="code-p">&lt;/main&gt;</span>`;

  const screenshotBlock = `

<span class="code-h">## Screenshot</span>
<span class="code-p">\`~/Downloads/PageNab_…png\`</span>
<span class="code-g">✓ Copied to clipboard</span>`;

  /* ── PRESET GENERATORS ─────────────────────────────────── */
  function getLightContent() {
    return metadataBlock + consoleBlock + networkBlock + screenshotBlock;
  }

  function getFullContent() {
    return metadataBlock + consoleBlock + networkBlock + cookiesBlock + storageBlock + perfBlock + interactionsBlock + domBlock + screenshotBlock;
  }

  function getCustomContent() {
    const toggles = customToggles.querySelectorAll('.toggle-item');
    let content = metadataBlock;
    toggles.forEach(t => {
      if (!t.classList.contains('active')) return;
      switch (t.dataset.toggle) {
        case 'console': content += consoleBlock; break;
        case 'network': content += networkBlock; break;
        case 'cookies': content += cookiesBlock; break;
        case 'storage': content += storageBlock; break;
        case 'performance': content += perfBlock; break;
        case 'interactions': content += interactionsBlock; break;
        case 'dom': content += domBlock; break;
      }
    });
    content += screenshotBlock;
    return content;
  }

  function estimateCustomTokens() {
    const active = customToggles.querySelectorAll('.toggle-item.active').length;
    if (active === 0) return '~100–200 tokens + screenshot';
    if (active <= 2) return '~200–500 tokens + screenshot';
    if (active <= 4) return '~500–2K tokens + screenshot';
    return '~2K–150K tokens + screenshot';
  }

  /* ── SWITCH PRESET ─────────────────────────────────────── */
  function switchPreset(preset) {
    // Fade out
    gsap.to(presetOutput, {
      opacity: 0,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        // Update content
        switch (preset) {
          case 'light':
            presetOutput.innerHTML = getLightContent();
            presetTokens.textContent = '~200–500 tokens + screenshot';
            customToggles.hidden = true;
            break;
          case 'full':
            presetOutput.innerHTML = getFullContent();
            presetTokens.textContent = '~1.5K–150K tokens + screenshot';
            customToggles.hidden = true;
            break;
          case 'custom':
            presetOutput.innerHTML = getCustomContent();
            presetTokens.textContent = estimateCustomTokens();
            customToggles.hidden = false;
            break;
        }

        // Fade in
        gsap.to(presetOutput, {
          opacity: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
      },
    });

    // Update tab active state
    presetTabs.forEach(tab => {
      const isActive = tab.dataset.preset === preset;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });
  }

  /* ── TAB CLICK HANDLERS ────────────────────────────────── */
  presetTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchPreset(tab.dataset.preset);
    });
  });

  /* ── CUSTOM TOGGLE HANDLERS ────────────────────────────── */
  customToggles.querySelectorAll('.toggle-item').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');

      // Update output in-place
      gsap.to(presetOutput, {
        opacity: 0,
        duration: 0.12,
        ease: 'power2.in',
        onComplete: () => {
          presetOutput.innerHTML = getCustomContent();
          presetTokens.textContent = estimateCustomTokens();
          gsap.to(presetOutput, {
            opacity: 1,
            duration: 0.18,
            ease: 'power2.out',
          });
        },
      });
    });
  });

  console.log('[PageNab] Animations initialised ✓');
})();
