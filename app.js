/* SynerSI — biometric interactions & SVG visuals */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── header ─────────────────────────────────────────── */
  const header = $('#siteHeader');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 16);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── mobile menu ────────────────────────────────────── */
  const menuBtn = $('#menuBtn');
  const menu = $('#mobileMenu');
  if (menuBtn && menu) {
    const setMenu = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      menu.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  /* ── reveal on scroll ───────────────────────────────── */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ── svg helpers ────────────────────────────────────── */
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };
  const rand = (seed) => {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  };
  const smooth = (pts) => {
    if (pts.length < 3) return '';
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    return d;
  };
  const jagged = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');

  /* ── biometric waveform ─────────────────────────────── */
  // A heart-rate trace: slow drift + sharp peaks + sensor noise.
  const buildTrace = (opts) => {
    const { n, min, max, seed, peak } = opts;
    const r = rand(seed);
    const out = [];
    let v = opts.base;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const drift = Math.sin(t * Math.PI * 2.6 + seed) * (max - min) * 0.16
                  + Math.sin(t * Math.PI * 7.1 + seed * 0.7) * (max - min) * 0.06;
      const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * peak)), 14) * (max - min) * 0.55;
      v += (r() - 0.5) * (max - min) * 0.12 + (drift + beat - (v - opts.base) * 0.5) * 0.35;
      out.push(Math.max(min, Math.min(max, v)));
    }
    return out;
  };

  const paintWave = (svg, values, o = {}) => {
    const W = svg.viewBox.baseVal.width || 520;
    const H = svg.viewBox.baseVal.height || 132;
    const padT = 8, padB = 8;
    const color = o.color || '#4EF2B8';
    const min = o.min != null ? o.min : Math.min(...values) - 2;
    const max = o.max != null ? o.max : Math.max(...values) + 2;
    const plotH = H - padT - padB;
    svg.textContent = '';

    const gid = `w-${o.id || Math.random().toString(36).slice(2, 7)}`;
    const defs = el('defs');
    const grad = el('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.append(el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.30' }));
    grad.append(el('stop', { offset: '70%', 'stop-color': color, 'stop-opacity': '0.04' }));
    grad.append(el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.append(grad);
    svg.append(defs);

    // hairlines
    [0.0, 0.5, 1.0].forEach((p) => {
      svg.append(el('line', {
        x1: 0, y1: padT + plotH * p, x2: W, y2: padT + plotH * p,
        stroke: 'rgba(255,255,255,.055)', 'stroke-width': 1,
        'vector-effect': 'non-scaling-stroke',
      }));
    });

    const pts = values.map((v, i) => [
      (i / (values.length - 1)) * W,
      padT + plotH - ((v - min) / (max - min)) * plotH,
    ]);
    const d = o.smooth ? smooth(pts) : jagged(pts);

    const area = el('path', {
      d: `${d} L ${W} ${padT + plotH} L 0 ${padT + plotH} Z`,
      fill: `url(#${gid})`, opacity: '0',
    });
    area.style.transition = 'opacity .9s ease .25s';
    svg.append(area);

    const line = el('path', {
      d, fill: 'none', stroke: color, 'stroke-width': o.weight || 1.5,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      'vector-effect': 'non-scaling-stroke',
    });
    line.style.filter = 'drop-shadow(0 0 6px rgba(78,242,184,.45))';
    svg.append(line);

    const len = line.getTotalLength ? line.getTotalLength() : 1200;
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = String(len);
    line.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.3,.7,.3,1)';

    const last = pts[pts.length - 1];
    const dot = el('circle', { cx: last[0], cy: last[1], r: 3, fill: color, opacity: '0' });
    const halo = el('circle', { cx: last[0], cy: last[1], r: 9, fill: 'none', stroke: color, 'stroke-opacity': '.25', opacity: '0' });
    dot.style.transition = 'opacity .4s ease 1.3s';
    halo.style.transition = 'opacity .4s ease 1.3s';
    svg.append(halo, dot);

    const play = () => {
      requestAnimationFrame(() => {
        line.style.strokeDashoffset = '0';
        area.style.opacity = '1';
        dot.style.opacity = '1';
        halo.style.opacity = '1';
      });
    };
    if (reduce) {
      [line, area, dot, halo].forEach((n) => { n.style.transition = 'none'; });
      line.style.strokeDashoffset = '0'; area.style.opacity = '1'; dot.style.opacity = '1'; halo.style.opacity = '1';
      return;
    }
    if (o.animate === false) {
      line.style.transition = 'none'; line.style.strokeDashoffset = '0'; area.style.opacity = '1'; dot.style.opacity = '1'; halo.style.opacity = '1';
      return;
    }
    play();
  };

  /* ── hero dashboard data ────────────────────────────── */
  const RANGES = {
    '1H': {
      labels: ['13:20', '13:40', '14:00', '14:20'], stamp: '14:20 기준',
      bpm: 74, hrv: 82, hrvState: '안정', rec: 92, resp: '14.2', sleep: 96, strain: '8.1',
      trace: { n: 130, base: 78, min: 58, max: 124, seed: 9, peak: 5.4 },
      scale: { min: 50, max: 130 },
    },
    '6H': {
      labels: ['09:00', '11:00', '13:00', '15:00'], stamp: '15:00 기준',
      bpm: 81, hrv: 74, hrvState: '보통', rec: 86, resp: '15.1', sleep: 91, strain: '7.4',
      trace: { n: 130, base: 86, min: 62, max: 138, seed: 41, peak: 4.2 },
      scale: { min: 55, max: 145 },
    },
    '24H': {
      labels: ['00:00', '06:00', '12:00', '18:00', '24:00'], stamp: '오늘 24시간',
      bpm: 76, hrv: 80, hrvState: '안정', rec: 90, resp: '14.6', sleep: 94, strain: '8.6',
      trace: { n: 150, base: 82, min: 54, max: 132, seed: 77, peak: 2.2 },
      scale: { min: 48, max: 140 },
    },
  };

  const heroSvg = $('[data-chart="hero"]');
  const sparkSvg = $('[data-chart="spark"]');
  const segBtns = $$('.seg__btn');

  const sparkValues = (seed) => {
    const r = rand(seed);
    let v = 60;
    return Array.from({ length: 34 }, (_, i) => {
      v += (r() - 0.45) * 16;
      return Math.max(38, Math.min(88, v + Math.sin(i / 3.2) * 8));
    });
  };

  const setRange = (key, animate) => {
    const d = RANGES[key];
    if (!d) return;
    segBtns.forEach((b) => {
      const on = b.dataset.range === key;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const stamp = $('#dashStamp');
    if (stamp) stamp.textContent = d.stamp;
    const setTxt = (sel, val) => { const n = $(sel); if (n) n.textContent = val; };
    setTxt('#dashBpm', d.bpm);
    setTxt('#dashHrv', d.hrv);
    setTxt('#dashHrvState', d.hrvState);
    setTxt('#dashRec', d.rec);
    setTxt('#dashResp', d.resp);
    setTxt('#dashSleep', d.sleep);
    setTxt('#dashStrain', d.strain);

    const arc = $('#ringArc');
    if (arc) {
      const c = 2 * Math.PI * 50;
      arc.style.transition = 'stroke-dashoffset .9s cubic-bezier(.3,.7,.3,1)';
      arc.setAttribute('stroke-dashoffset', String(c * (1 - d.rec / 100)));
    }
    const axis = $('#dashAxis');
    if (axis) axis.innerHTML = d.labels.map((l) => `<span>${l}</span>`).join('');

    if (heroSvg) {
      const values = buildTrace(d.trace);
      paintWave(heroSvg, values, {
        id: `hero${key}`, min: d.scale.min, max: d.scale.max,
        color: '#4EF2B8', weight: 1.5, animate,
      });
    }
    if (sparkSvg) {
      paintWave(sparkSvg, sparkValues(d.hrv + d.bpm), {
        id: `spark${key}`, color: '#34E0A1', weight: 1.4, animate,
        smooth: true,
      });
    }
  };

  if (heroSvg) {
    setRange('1H', true);
  }
  segBtns.forEach((b) => b.addEventListener('click', () => setRange(b.dataset.range, true)));

  /* ── showcase tabs ──────────────────────────────────── */
  const tabs = $$('.tab');
  const figs = ['Fig. 02 — 20인 실시간 관제', 'Fig. 03 — HRV 회복 곡선', 'Fig. 04 — 개인 효과 리포트'];
  const figEl = $('[data-fig]');
  const selectTab = (i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) { panel.hidden = !on; panel.classList.toggle('is-active', on); }
    });
    if (figEl) figEl.textContent = figs[i];
    if (focus && tabs[i]) tabs[i].focus();
    if (i === 1) {
      const c = $('[data-chart="curve"]');
      if (c) drawCurve(c, true);
    }
  };
  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => selectTab(i));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        selectTab(next, true);
      }
    });
  });

  /* ── curve chart (3 phases) ─────────────────────────── */
  const drawCurve = (svg, animate) => {
    const W = 760, H = 300, padT = 18, padB = 16;
    const keys = [
      [0, 72], [0.08, 70], [0.16, 68], [0.24, 67], [0.3, 66], [0.38, 64],
      [0.46, 63], [0.52, 62.5], [0.58, 64], [0.66, 68], [0.74, 74],
      [0.82, 78], [0.9, 81], [1, 82],
    ];
    const r = rand(31);
    const n = 82;
    const values = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      let k = 0;
      while (k < keys.length - 2 && keys[k + 1][0] < t) k++;
      const [t0, v0] = keys[k], [t1, v1] = keys[k + 1];
      const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
      const v = v0 + (v1 - v0) * (f * f * (3 - 2 * f));
      values.push(v + (r() - 0.5) * 1.6);
    }

    const plotH = H - padT - padB;
    const min = 58, max = 88;
    const yOf = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;
    svg.textContent = '';

    const bands = [
      { from: 0, to: 0.28, fill: 'rgba(255,255,255,.022)', label: '' },
      { from: 0.28, to: 0.78, fill: 'rgba(52,224,161,.05)' },
      { from: 0.78, to: 1, fill: 'rgba(120,220,255,.045)' },
    ];
    bands.forEach((b) => {
      svg.append(el('rect', { x: b.from * W, y: 0, width: (b.to - b.from) * W, height: H, fill: b.fill }));
      if (b.to < 1) {
        svg.append(el('line', {
          x1: b.to * W, y1: 0, x2: b.to * W, y2: H,
          stroke: 'rgba(255,255,255,.13)', 'stroke-width': 1, 'stroke-dasharray': '3 5',
        }));
      }
    });
    [0, 0.5, 1].forEach((p) => {
      svg.append(el('line', {
        x1: 0, y1: padT + plotH * p, x2: W, y2: padT + plotH * p,
        stroke: 'rgba(255,255,255,.05)', 'stroke-width': 1,
      }));
    });

    const pts = values.map((v, i) => [(i / (n - 1)) * W, yOf(v)]);
    const d = smooth(pts);

    const defs = el('defs');
    const grad = el('linearGradient', { id: 'curveFill', x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.append(el('stop', { offset: '0%', 'stop-color': '#34E0A1', 'stop-opacity': '0.26' }));
    grad.append(el('stop', { offset: '100%', 'stop-color': '#34E0A1', 'stop-opacity': '0' }));
    defs.append(grad);
    svg.append(defs);

    const area = el('path', {
      d: `${d} L ${W} ${padT + plotH} L 0 ${padT + plotH} Z`, fill: 'url(#curveFill)',
    });
    svg.append(area);

    const line = el('path', {
      d, fill: 'none', stroke: '#4EF2B8', 'stroke-width': 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke',
    });
    line.style.filter = 'drop-shadow(0 0 8px rgba(78,242,184,.4))';
    svg.append(line);

    // peak marker
    const peakIdx = values.indexOf(Math.max(...values));
    const pk = pts[peakIdx];
    svg.append(el('line', {
      x1: pk[0], y1: pk[1], x2: pk[0], y2: padT + plotH,
      stroke: 'rgba(78,242,184,.35)', 'stroke-width': 1, 'stroke-dasharray': '2 4',
    }));
    svg.append(el('circle', { cx: pk[0], cy: pk[1], r: 4, fill: '#4EF2B8' }));
    svg.append(el('circle', { cx: pk[0], cy: pk[1], r: 10, fill: 'none', stroke: 'rgba(78,242,184,.3)' }));

    if (animate !== false && !reduce) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = String(len);
      line.style.strokeDashoffset = String(len);
      line.style.transition = 'stroke-dashoffset 1.9s cubic-bezier(.3,.7,.3,1)';
      area.style.opacity = '0';
      area.style.transition = 'opacity 1s ease .4s';
      requestAnimationFrame(() => {
        line.style.strokeDashoffset = '0';
        area.style.opacity = '1';
      });
    }
  };
  const curveSvg = $('[data-chart="curve"]');
  if (curveSvg) drawCurve(curveSvg, false);

  /* ── live 20-person grid ────────────────────────────── */
  const grid = $('#liveGrid');
  if (grid) {
    const rows = [
      ['USER-001', 78, 'ok', 'A조 · 다이어트'],
      ['USER-002', 84, 'ok', 'A조 · 스트레스'],
      ['USER-003', 91, 'ok', 'A조 · 회복력'],
      ['USER-004', 112, 'watch', 'A조 · 심폐'],
      ['USER-005', 76, 'ok', 'B조 · 수면'],
      ['USER-006', 69, 'ok', 'B조 · 수면'],
      ['USER-007', 88, 'ok', 'B조 · 회복력'],
      ['USER-008', 121, 'over', 'B조 · 심폐'],
      ['USER-009', 73, 'ok', 'C조 · 스트레스'],
      ['USER-010', 82, 'ok', 'C조 · 다이어트'],
      ['USER-011', 79, 'ok', 'C조 · 회복력'],
      ['USER-012', 74, 'ok', 'C조 · 스트레스'],
      ['USER-013', 96, 'watch', 'D조 · 심폐'],
      ['USER-014', 71, 'ok', 'D조 · 생활습관'],
      ['USER-015', 80, 'ok', 'D조 · 다이어트'],
      ['USER-016', 67, 'ok', 'D조 · 수면'],
      ['USER-017', 86, 'ok', 'E조 · 회복력'],
      ['USER-018', 77, 'ok', 'E조 · 스트레스'],
      ['USER-019', 93, 'ok', 'E조 · 심폐'],
      ['USER-020', 75, 'ok', 'E조 · 생활습관'],
    ];
    const colors = { ok: '#34E0A1', watch: '#E2B567', over: '#E5786B', off: '#6C7B75' };
    const spark = (base, seed) => {
      const r = rand(seed);
      const vals = Array.from({ length: 16 }, (_, i) => base + Math.sin(i * 0.9 + seed) * 5 + (r() - 0.5) * 6);
      const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
      return vals.map((v, i) => `${((i / (vals.length - 1)) * 60).toFixed(1)},${(15 - ((v - min) / span) * 12).toFixed(1)}`).join(' ');
    };
    rows.forEach(([id, bpm, state, group], i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.innerHTML =
        `<div class="cell__top"><span class="cell__id">${id}</span><i class="dot dot--${state}"></i></div>` +
        `<div class="cell__bpm">${bpm}<span>bpm</span></div>` +
        `<svg class="cell__spark" viewBox="0 0 60 16" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${colors[state]}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" points="${spark(bpm, i + 3)}" opacity=".9"/></svg>` +
        `<span class="cell__name">${group}</span>`;
      grid.append(cell);
    });
  }

  /* ── copy email ─────────────────────────────────────── */
  const toast = $('#toast');
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-on'));
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.classList.remove('is-on');
      setTimeout(() => { toast.hidden = true; }, 320);
    }, 2200);
  };
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(text);
        showToast('이메일 주소를 복사했습니다 — ' + text);
      } catch {
        showToast('복사할 수 없습니다. 주소를 직접 선택해 주세요.');
      }
    });
  });
})();
