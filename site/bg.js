/**
 * PageNab — "Data Capture Network" Background v2
 *
 * Same cast of 8 labeled nodes (console · network · DOM · cookies ·
 * storage · perf · screenshot · interactions) flowing toward the
 * clipboard hub — but now with richer physics and interactions:
 *
 *  NODE PHYSICS
 *    Nodes move on Lissajous paths that become spring *targets*.
 *    Each node has velocity (vx, vy) affected by:
 *      - spring pull toward its Lissajous target
 *      - scroll parallax (nodes at different depth shift at different rates)
 *      - mouse repulsion field (within 150 px)
 *      - soft repulsion from other nodes (prevents clustering)
 *
 *  MOUSE INTERACTIONS
 *    - Proximity brightens the nearest node and expands its aura
 *    - Fast mouse movement spawns bonus packets from the closest node
 *    - Bezier control points are pulled ("gravitational lens") toward
 *      the cursor when it is near the midpoint of a connection line,
 *      making the lines bend organically around the pointer
 *    - Click on blank canvas area bursts 7 packets from the nearest node
 *
 *  CONNECTION LINES
 *    Animated dashed "marching ants" flowing toward the hub.
 *    Dash speed scales with scroll velocity.
 *    Control-point warp increases at high scroll velocity.
 *    Mouse gravitational lens deforms each line independently.
 *
 *  HERO SECTION SYNC
 *    window.PageNabBg.flash() is called by main.js when the animated
 *    cursor clicks the extension button — all nodes burst simultaneously.
 *
 *  FEATURE CARD ACTIVATION
 *    IntersectionObserver on each .capture-item: when a card enters the
 *    viewport its matching background node glows and spawns a packet.
 *    (Screenshots→screenshot  Console Logs→console  DOM→DOM  …)
 *
 *  HUB DETAILS
 *    - Heartbeat: slow sine-wave glow (~2 s period)
 *    - Receive rings: expanding ripples each time a packet arrives
 *    - Scale pulse: the clipboard icon briefly scales up on receipt
 *    - Tracks mouse with 3× the sensitivity of the previous version
 *
 *  SCROLL
 *    - scrollY read inside rAF (no event-timing jitter on trackpads)
 *    - EMA velocity used for packet rate, dash speed, and warp factor
 *    - depth-differentiated parallax: "far" nodes shift more per scroll px
 *
 *  READABILITY BUDGET (white background):
 *    dashed lines   0.025 – 0.10  alpha
 *    node labels    0.055 – 0.35  alpha (boosts on mouse proximity / feature)
 *    packets        0.10  – 0.68  alpha
 *    hub icon       0.06  – 0.38  alpha
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const IND = [99, 102, 241];  // indigo accent
  const RED = [239, 68, 68];   // error red — console node only

  /* ── Node definitions ─────────────────────────────────────────── */
  // depth < 1  → near (shifts less on scroll)
  // depth > 1  → far  (shifts more on scroll — parallax depth illusion)
  const NODE_DEFS = [
    { label: 'console',      rgb: RED, freqX: 0.00021, freqY: 0.00017, arX: 0.17, arY: 0.20, depth: 0.8 },
    { label: 'network',      rgb: IND, freqX: 0.00016, freqY: 0.00023, arX: 0.22, arY: 0.16, depth: 1.2 },
    { label: 'DOM',          rgb: IND, freqX: 0.00024, freqY: 0.00018, arX: 0.19, arY: 0.22, depth: 0.7 },
    { label: 'cookies',      rgb: IND, freqX: 0.00013, freqY: 0.00021, arX: 0.23, arY: 0.15, depth: 1.3 },
    { label: 'storage',      rgb: IND, freqX: 0.00019, freqY: 0.00015, arX: 0.15, arY: 0.24, depth: 0.9 },
    { label: 'perf',         rgb: IND, freqX: 0.00022, freqY: 0.00019, arX: 0.20, arY: 0.18, depth: 1.1 },
    { label: 'screenshot',   rgb: IND, freqX: 0.00015, freqY: 0.00025, arX: 0.18, arY: 0.21, depth: 1.4 },
    { label: 'interactions', rgb: IND, freqX: 0.00018, freqY: 0.00013, arX: 0.21, arY: 0.17, depth: 0.6 },
  ];

  /* ── State ────────────────────────────────────────────────────── */
  var W = 0, H = 0;
  var tick = 0;
  var mouseX = 0, mouseY = 0;
  var prevMouseX = 0, prevMouseY = 0;
  var mouseSpeed = 0;

  var hub = { x: 0, y: 0, glow: 0, scale: 1, hbPhase: 0 };

  var nodes    = [];
  var packets  = [];
  var ripples  = [];    // section-enter ripples
  var hubRings = [];    // packet-received rings at hub

  var scrollVel         = 0;
  var lastRafSY         = 0;
  var captureBright     = 0;
  var spawnAccum        = 0;
  var mousePacketCooldown = 0;

  /* ── Resize ───────────────────────────────────────────────────── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    mouseX = W / 2;
    mouseY = H / 2;
    initNodes();
    hub.x = W * (W >= 1024 ? 0.70 : 0.62);
    hub.y = H * 0.38;
  }

  function initNodes() {
    nodes = NODE_DEFS.map(function (def, i) {
      var angle = (i / NODE_DEFS.length) * Math.PI * 2 - Math.PI / 2;
      var cx = W * 0.50 + Math.cos(angle) * W * 0.28;
      var cy = H * 0.50 + Math.sin(angle) * H * 0.25;
      return {
        label:  def.label,
        rgb:    def.rgb,
        freqX:  def.freqX,
        freqY:  def.freqY,
        arX:    def.arX,
        arY:    def.arY,
        depth:  def.depth,
        cx: cx, cy: cy,
        phX:  (i * 1.31) % (Math.PI * 2),
        phX2: (i * 2.09) % (Math.PI * 2),
        phY:  (i * 0.91) % (Math.PI * 2),
        phY2: (i * 1.73) % (Math.PI * 2),
        // physics state
        x: cx, y: cy,
        vx: 0, vy: 0,
        lx: cx, ly: cy,
        // brightness layers
        bright:        0,
        mouseBright:   0,
        featureBright: 0,
        errPhase: i * 0.4,
      };
    });
  }

  window.addEventListener('resize', resize, { passive: true });

  /* ── Mouse tracking ───────────────────────────────────────────── */
  window.addEventListener('mousemove', function (e) {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseSpeed = Math.hypot(mouseX - prevMouseX, mouseY - prevMouseY);
  }, { passive: true });

  /* ── Click → burst from nearest node ─────────────────────────── */
  // canvas has pointer-events:none in CSS, so we listen on document
  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button, input, label, [role="button"], [role="tab"]')) return;
    var nearest = -1, nearDist = Infinity;
    nodes.forEach(function (n, i) {
      var d = Math.hypot(n.x - e.clientX, n.y - e.clientY);
      if (d < nearDist) { nearDist = d; nearest = i; }
    });
    if (nearest >= 0) {
      nodes[nearest].bright = 1;
      for (var k = 0; k < 7; k++) {
        (function (delay) {
          setTimeout(function () { spawnPacket(nearest, 2.5); }, delay);
        })(k * 50);
      }
    }
  });

  /* ── Packet factory ───────────────────────────────────────────── */
  function spawnPacket(nodeIdx, speedMult) {
    var node = nodes[nodeIdx];
    _makePacket(nodeIdx, node.x, node.y, speedMult || 1);
  }

  function _makePacket(nodeIdx, sx, sy, speedMult) {
    var mx  = (sx + hub.x) * 0.5;
    var my  = (sy + hub.y) * 0.5;
    var dx  = hub.x - sx;
    var dy  = hub.y - sy;
    var len = Math.hypot(dx, dy) || 1;
    var off = (Math.random() - 0.5) * 100;
    packets.push({
      ni:  nodeIdx,
      sx: sx, sy: sy,
      cpx: mx - (dy / len) * 42 + off,
      cpy: my + (dx / len) * 42 + off * 0.5,
      t:   0,
      spd: (0.003 + Math.random() * 0.003) * speedMult,
      received: false,
    });
    if (packets.length > 270) packets.shift();
  }

  /* ── Capture trigger ─────────────────────────────────────────── */
  function triggerCapture(intensity) {
    captureBright = Math.min(1, captureBright + intensity);
    nodes.forEach(function (n, i) {
      n.bright = Math.min(1, n.bright + intensity * 0.9);
      setTimeout(function () { spawnPacket(i, 2.0 * intensity); },
        i * 55 + Math.random() * 30);
    });
  }

  /* ── Feature card ↔ node activation ─────────────────────────── */
  function observeFeatureCards() {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var h3 = entry.target.querySelector('h3');
        if (!h3) return;
        var text = h3.textContent.toLowerCase();
        var labels = [];
        if (text.indexOf('screenshot')  >= 0) labels.push('screenshot');
        if (text.indexOf('console')     >= 0) labels.push('console');
        if (text.indexOf('network')     >= 0) labels.push('network');
        if (text.indexOf('dom')         >= 0) labels.push('DOM');
        if (text.indexOf('storage')     >= 0) labels.push('storage');
        if (text.indexOf('cookie')      >= 0) labels.push('cookies');
        if (text.indexOf('perf')        >= 0 ||
            text.indexOf('performance') >= 0) labels.push('perf');
        if (text.indexOf('interact')    >= 0) labels.push('interactions');

        labels.forEach(function (label) {
          var idx = -1;
          nodes.forEach(function (n, i) { if (n.label === label) idx = i; });
          if (idx < 0) return;
          var node = nodes[idx];
          if (entry.isIntersecting) {
            node.featureBright = 1.0;
            spawnPacket(idx, 1.6);
          } else {
            node.featureBright = Math.max(0, node.featureBright - 0.3);
          }
        });
      });
    }, { threshold: 0.4 });

    document.querySelectorAll('.capture-item').forEach(function (el) {
      obs.observe(el);
    });
  }

  /* ── Section ripples ─────────────────────────────────────────── */
  function observeSections() {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var r = entry.target.getBoundingClientRect();
        ripples.push({ x: r.left + 80, y: r.top + 60, r: 0, life: 1.0 });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('section').forEach(function (s) { obs.observe(s); });
  }

  /* ── Auto-capture flash ──────────────────────────────────────── */
  function scheduleCaptureFlash() {
    setTimeout(function () {
      triggerCapture(1.0);
      scheduleCaptureFlash();
    }, 10000 + Math.random() * 6000);
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function lerp(a, b, t)    { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rgba(rgb, a)     {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + clamp(a, 0, 1) + ')';
  }
  function qbez(sx, sy, cpx, cpy, ex, ey, t) {
    var u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cpx + t * t * ex,
      y: u * u * sy + 2 * u * t * cpy + t * t * ey,
    };
  }

  /* ── Main render loop ────────────────────────────────────────── */
  function loop() {
    ctx.clearRect(0, 0, W, H);
    tick++;

    /* ── Scroll (frame-synced — no trackpad jitter) ───────── */
    var sy           = window.scrollY || 0;
    var scrollDelta  = sy - lastRafSY;
    scrollVel        = scrollVel * 0.78 + Math.abs(scrollDelta) * 0.22;
    lastRafSY        = sy;
    var velF         = clamp(scrollVel * 0.07, 0, 1);

    /* ── Global decay ─────────────────────────────────────── */
    captureBright = clamp(captureBright * 0.92, 0, 1);
    scrollVel     = clamp(scrollVel, 0, 40);
    hub.glow      = clamp(hub.glow  * 0.93, 0, 1);
    hub.scale     = lerp(hub.scale, 1.0, 0.10);
    hub.hbPhase  += 0.018;
    var hbPulse   = 0.5 + 0.5 * Math.sin(hub.hbPhase);  // heartbeat 0→1→0
    mouseSpeed   *= 0.80;  // decay so it doesn't stay high between frames

    nodes.forEach(function (n) {
      n.bright        = clamp(n.bright        * 0.96, 0, 1);
      n.mouseBright   = clamp(n.mouseBright   * 0.90, 0, 1);
      n.featureBright = clamp(n.featureBright * 0.995, 0, 1);
    });

    /* ── Hub tracks mouse ─────────────────────────────────── */
    var hubTargetX = W * (W >= 1024 ? 0.70 : 0.62) + (mouseX - W * 0.5) * 0.12;
    var hubTargetY = H * 0.38                        + (mouseY - H * 0.5) * 0.08;
    hub.x = lerp(hub.x, hubTargetX, 0.03);
    hub.y = lerp(hub.y, hubTargetY, 0.03);

    /* ── Node physics ─────────────────────────────────────── */
    var scrollParallax = clamp(scrollDelta, -18, 18);

    nodes.forEach(function (n) {
      /* 1 — Lissajous target (dual-frequency drift) */
      n.lx = clamp(
        n.cx + Math.sin(tick * n.freqX         + n.phX)  * W * n.arX
             + Math.sin(tick * n.freqX * 1.618 + n.phX2) * W * n.arX * 0.38,
        80, W - 80);
      n.ly = clamp(
        n.cy + Math.cos(tick * n.freqY         + n.phY)  * H * n.arY
             + Math.cos(tick * n.freqY * 1.618 + n.phY2) * H * n.arY * 0.38,
        50, H - 50);

      /* 2 — Spring toward Lissajous target */
      n.vx += (n.lx - n.x) * 0.016;
      n.vy += (n.ly - n.y) * 0.016;

      /* 3 — Scroll parallax (depth-differentiated, kept subtle) */
      n.vy += scrollParallax * (n.depth - 1.0) * 0.18;

      /* 4 — Mouse repulsion field (gentle nudge only) */
      var mdx   = n.x - mouseX;
      var mdy   = n.y - mouseY;
      var mdist = Math.hypot(mdx, mdy);
      if (mdist < 100 && mdist > 1) {
        var f = Math.pow((100 - mdist) / 100, 2) * 3;
        n.vx += (mdx / mdist) * f;
        n.vy += (mdy / mdist) * f;
        n.mouseBright = Math.min(1, n.mouseBright + 0.06 * (1 - mdist / 100));
      }

      /* 5 — Node-node soft repulsion */
      nodes.forEach(function (o) {
        if (o === n) return;
        var odx = n.x - o.x;
        var ody = n.y - o.y;
        var od  = Math.hypot(odx, ody) || 1;
        if (od < 88) {
          var rf = ((88 - od) / 88) * 1.8;
          n.vx += (odx / od) * rf;
          n.vy += (ody / od) * rf;
        }
      });

      /* 6 — Dampen & apply */
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x = clamp(n.x + n.vx, 60, W - 60);
      n.y = clamp(n.y + n.vy, 40, H - 40);
    });

    /* ── Mouse trail packets — removed for minimalism */

    /* ── Ambient packet spawning ──────────────────────────── */
    spawnAccum += 0.008 + velF * 0.026 + captureBright * 0.07;
    while (spawnAccum >= 1) {
      spawnPacket(Math.floor(Math.random() * nodes.length), 1 + velF * 0.8);
      spawnAccum -= 1;
    }

    /* ── Dash offset — lines march toward hub, subtly faster on scroll ─ */
    var dashOffset = -(tick * (0.45 + velF * 0.5));

    /* ── 1. Connection lines ──────────────────────────────── */
    nodes.forEach(function (node) {
      var tb   = node.bright + node.mouseBright * 0.8 + node.featureBright * 0.6 + captureBright * 0.25;
      var lineA = clamp(0.025 + tb * 0.04, 0, 0.10);
      var lineW = 0.5 + tb * 0.7;

      /* Base control point */
      var mx = (node.x + hub.x) * 0.5;
      var my = (node.y + hub.y) * 0.5;
      var dx = hub.x - node.x;
      var dy = hub.y - node.y;
      var len = Math.hypot(dx, dy) || 1;
      var warp = 1 + velF * 0.6;   // scroll warp (subtle)
      var cpx = mx - (dy / len) * 38 * warp;
      var cpy = my + (dx / len) * 38 * warp;

      /* Gravitational lens — subtle mouse pull on control point */
      var lDx = mouseX - mx;
      var lDy = mouseY - my;
      var lDist = Math.hypot(lDx, lDy);
      if (lDist < 140 && lDist > 1) {
        var lensF = (1 - lDist / 140) * 12;
        cpx += (lDx / lDist) * lensF;
        cpy += (lDy / lDist) * lensF;
      }

      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.quadraticCurveTo(cpx, cpy, hub.x, hub.y);
      ctx.strokeStyle    = rgba(node.rgb, lineA);
      ctx.lineWidth      = lineW;
      ctx.setLineDash([3, 10]);
      ctx.lineDashOffset = dashOffset;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    /* ── 2. Packets ──────────────────────────────────────── */
    packets = packets.filter(function (p) { return p.t < 1.0; });
    packets.forEach(function (p) {
      p.t += p.spd * (1 + velF * 0.9);
      var node = nodes[p.ni];
      var tb   = node.bright + node.mouseBright * 0.6 + captureBright * 0.5;
      var pos  = qbez(p.sx, p.sy, p.cpx, p.cpy, hub.x, hub.y, p.t);
      var life = Math.sin(p.t * Math.PI);
      var a    = life * (0.12 + tb * 0.14);
      var r    = 2.5 + p.t * 2.2;  // grows as it approaches hub

      /* Receive event: spawn hub ring once per packet */
      if (p.t > 0.92 && !p.received) {
        p.received  = true;
        hub.glow    = Math.min(1, hub.glow + 0.06);
        hub.scale   = Math.min(1.35, hub.scale + 0.06);
        hubRings.push({ r: 0, life: 0.8 });
      }

      /* Halo glow */
      var gr = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 11);
      gr.addColorStop(0, rgba(node.rgb, a * 0.75));
      gr.addColorStop(1, rgba(node.rgb, 0));
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();

      /* Core dot */
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(node.rgb, clamp(a * 2.5, 0, 0.68));
      ctx.fill();
    });

    /* ── 3. Nodes ────────────────────────────────────────── */
    ctx.save();
    ctx.font         = '500 11.5px "JetBrains Mono", "Courier New", monospace';
    ctx.textBaseline = 'middle';

    nodes.forEach(function (node) {
      var tb          = node.bright + node.mouseBright * 0.9 + node.featureBright * 0.7 + captureBright * 0.4;
      var ba          = clamp(0.055 + tb * 0.20, 0, 0.78);
      var mouseNear   = node.mouseBright   > 0.10;
      var featureOn   = node.featureBright > 0.30;

      /* Aura glow — expands on mouse proximity or feature activation */
      var auraR = 18 + (mouseNear ? 14 : 0) + (featureOn ? 9 : 0);
      var aura  = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, auraR);
      aura.addColorStop(0, rgba(node.rgb, ba * 1.5));
      aura.addColorStop(1, rgba(node.rgb, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, auraR, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      /* Orbit ring when active */
      if (ba > 0.18) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6 + tb * 3, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(node.rgb, clamp((ba - 0.1) * 0.55, 0, 0.22));
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }

      /* Core dot — size scales with brightness */
      var dotR = 3.5 + tb * 1.8;
      ctx.beginPath();
      ctx.arc(node.x, node.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = rgba(node.rgb, clamp(ba * 3.2, 0, 0.68));
      ctx.fill();

      /* Label — more readable when mouse is near or feature card is active */
      var labelA = clamp(ba * 1.1 + (mouseNear ? 0.18 : 0) + (featureOn ? 0.10 : 0), 0, 0.45);
      var lw = ctx.measureText(node.label).width;
      var lx = node.x > W - 90 ? node.x - lw - 10 : node.x + 9;
      ctx.fillStyle = rgba(node.rgb, labelA);
      ctx.fillText(node.label, lx, node.y);

      /* Console: pulsing red error dot (echoes hc-err-dot in hero card) */
      if (node.label === 'console') {
        node.errPhase += 0.028;
        var ep = (0.5 + 0.5 * Math.sin(node.errPhase)) * (0.08 + tb * 0.18);
        ctx.beginPath();
        ctx.arc(node.x - 7, node.y - 7, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(RED, ep);
        ctx.fill();
      }
    });

    ctx.restore();

    /* ── 4. Hub — clipboard icon ─────────────────────────── */
    var ha   = clamp(0.10 + hub.glow * 0.28 + captureBright * 0.12 + hbPulse * 0.030, 0, 0.58);
    var hubR = 38 + hub.glow * 26 + hbPulse * 6;

    /* Heartbeat glow */
    var hGr = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, hubR);
    hGr.addColorStop(0,   rgba(IND, ha * 1.4));
    hGr.addColorStop(0.5, rgba(IND, ha * 0.5));
    hGr.addColorStop(1,   rgba(IND, 0));
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, hubR, 0, Math.PI * 2);
    ctx.fillStyle = hGr;
    ctx.fill();

    /* Receive rings */
    hubRings = hubRings.filter(function (hr) { return hr.life > 0; });
    hubRings.forEach(function (hr) {
      hr.r    += 2.8;
      hr.life -= 0.04;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hr.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(IND, hr.life * 0.22);
      ctx.lineWidth   = 1.3;
      ctx.stroke();
    });

    /* Clipboard icon (scale pulse on receive) */
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.scale(hub.scale, hub.scale);
    ctx.strokeStyle = rgba(IND, clamp(ha * 1.9, 0, 0.55));
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    var bw = 15, bh = 18;
    var bx = -bw / 2, by = -bh / 2 + 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 2.5); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-5, by - 3.5, 10, 5, 2); ctx.stroke();
    ctx.lineWidth = 1.1;
    [4, 8, 12].forEach(function (d) {
      ctx.beginPath();
      ctx.moveTo(bx + 2, by + d);
      ctx.lineTo(bx + bw - 2, by + d);
      ctx.stroke();
    });
    ctx.restore();

    /* ── 5. Section ripples ───────────────────────────────── */
    ripples = ripples.filter(function (rp) { return rp.life > 0; });
    ripples.forEach(function (rp) {
      rp.r    = (1 - rp.life) * 110;
      rp.life -= 0.009;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(IND, rp.life * 0.055);
      ctx.lineWidth   = 1;
      ctx.stroke();
    });

    requestAnimationFrame(loop);
  }

  /* ── Boot ─────────────────────────────────────────────────────── */
  resize();
  observeSections();
  observeFeatureCards();
  scheduleCaptureFlash();
  loop();

  /* Public API — called by main.js when hero card cursor "clicks" */
  window.PageNabBg = {
    flash: function () { triggerCapture(0.85); },
    burst: function () { triggerCapture(1.0);  },
  };

})();
