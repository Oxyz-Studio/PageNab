/**
 * PageNab — Award-Winning Site Animations
 * GSAP + ScrollTrigger · Cursor orb · Magnetic buttons · Count-up
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
        // Preserve inner elements (em, strong, etc.) while splitting text inside
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

  // "Page" — char-by-char stagger rise
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

  // "Nab" — slides in from right, snaps from extra counter-clockwise to final -8deg
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

  // Arrow — pops in with a spring, then floats continuously
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

    // After intro — continuous float + subtle rotate pulse
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

  // Rest of hero elements
  tl.to('.hero-eyebrow',  { opacity: 1, y: 0, duration: 0.6 }, '-=1.0')
    .to('.hero-subtitle', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .to('.hero-actions',  { opacity: 1, y: 0, duration: 0.5 }, '-=0.35')
    .to('.hero-trust',    { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
    .to('.hero-card',     { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5')
    .to('.hero-scroll',   { opacity: 1, duration: 0.5 }, '-=0.2');

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
  gsap.utils.toArray('.reveal').forEach((el, i) => {
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

  /* ── HOW IT WORKS — STEPS LINE ──────────────────────────── */
  const stepsLine = document.querySelector('.steps-line');
  if (stepsLine) {
    gsap.to(stepsLine, {
      scaleX: 1,
      duration: 1.2,
      ease: 'none',
      scrollTrigger: {
        trigger: '.steps-track',
        start: 'top 65%',
        end: 'top 30%',
        scrub: 0.8,
      },
    });
  }

  /* ── BENTO HOVER RADIAL GLOW ────────────────────────────── */
  document.querySelectorAll('.bento-item').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
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

      // Close all
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

  /* ── PROBLEM CARDS STAGGER ──────────────────────────────── */
  const problemCards = document.querySelectorAll('.problem-card');
  problemCards.forEach((card, i) => {
    const fromLeft = i % 2 === 0;
    gsap.from(card, {
      x: fromLeft ? -60 : 60,
      opacity: 0,
      duration: 0.75,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
      },
      delay: i * 0.08,
    });
  });

  /* ── BENTO ITEMS STAGGER ────────────────────────────────── */
  gsap.from('.bento-item', {
    opacity: 0,
    y: 40,
    scale: 0.95,
    stagger: 0.08,
    duration: 0.65,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.bento',
      start: 'top 80%',
    },
  });

  /* ── PRESET CARDS ───────────────────────────────────────── */
  gsap.from('.preset-card', {
    opacity: 0,
    y: 36,
    stagger: 0.12,
    duration: 0.65,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.presets-grid',
      start: 'top 82%',
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

  /* ── MODE CARDS ─────────────────────────────────────────── */
  gsap.from('.mode-card', {
    opacity: 0,
    y: 36,
    stagger: 0.12,
    duration: 0.7,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.modes-grid',
      start: 'top 82%',
    },
  });

  /* ── STEP CARDS ─────────────────────────────────────────── */
  gsap.from('.step', {
    opacity: 0,
    y: 40,
    stagger: 0.15,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.steps-track',
      start: 'top 80%',
    },
  });

  /* ── FAQ ITEMS ──────────────────────────────────────────── */
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

  /* ── CTA HEADING ────────────────────────────────────────── */
  const ctaHeading = document.querySelector('.cta-heading');
  if (ctaHeading) {
    const chars = splitChars(ctaHeading);
    gsap.from(chars, {
      y: 50,
      opacity: 0,
      stagger: 0.02,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: ctaHeading,
        start: 'top 80%',
      },
    });
  }

  console.log('[PageNab] Animations initialised ✓');
})();
