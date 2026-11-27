/* SynerSI — interaction & data visuals */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── header ─────────────────────────────────────────── */
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── mobile menu ────────────────────────────────────── */
  const menuBtn = $('#menuBtn');
  const menu = $('#mobileMenu');
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

  /* ── reveal on scroll ───────────────────────────────── */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ── tiny chart engine ──────────────────────────────── */
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };

  // deterministic pseudo-random so screenshots stay identical
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

  const interp = (keys, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      let k = 0;
      while (k < keys.length - 2 && keys[k + 1][0] < t) k++;
      const [t0, v0] = keys[k];
      const [t1, v1] = keys[k + 1];
      const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
      out.push(v0 + (v1 - v0) * (f * f * (3 - 2 * f)));
    }
    return out;
  };

  const drawChart = (svg, spec) => {
    const W = svg.viewBox.baseVal.width || 560;
    const H = svg.viewBox.baseVal.height || 176;
    const padTop = 14, padBottom = 10;
    svg.textContent = '';

    const defs = el('defs');
    const gid = `g-${spec.id}`;
    const grad = el('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.append(el('stop', { offset: '0%', 'stop-color': spec.color, 'stop-opacity': '0.20' }));
    grad.append(el('stop', { offset: '100%', 'stop-color': spec.color, 'stop-opacity': '0' }));
    defs.append(grad);
    svg.append(defs);

    const plotH = H - padTop - padBottom;
    const xOf = (i, n) => (i / (n - 1)) * W;
    const min = spec.min, max = spec.max;
    const yOf = (v) => padTop + plotH - ((v - min) / (max - min)) * plotH;

    // phase bands
    if (spec.bands) {
      spec.bands.forEach((b) => {
        svg.append(el('rect', {
          x: b.from * W, y: 0, width: (b.to - b.from) * W, height: H,
          fill: b.fill,
        }));
        if (b.to < 1) {
          svg.append(el('line', {
            x1: b.to * W, y1: 0, x2: b.to * W, y2: H,
            stroke: 'rgba(19,23,21,.10)', 'stroke-width': 1, 'stroke-dasharray': '2 3',
          }));
        }
      });
    }

    // hairlines
    [0.25, 0.5, 0.75].forEach((p) => {
      svg.append(el('line', {
        x1: 0, y1: padTop + plotH * p, x2: W, y2: padTop + plotH * p,
        stroke: 'rgba(19,23,21,.06)', 'stroke-width': 1,
      }));
    });
    svg.append(el('line', {
      x1: 0, y1: padTop + plotH, x2: W, y2: padTop + plotH,
      stroke: 'rgba(19,23,21,.14)', 'stroke-width': 1,
    }));

    // series
    const series = spec.values;
    const pts = series.map((v, i) => [xOf(i, series.length), yOf(v)]);
    const d = smooth(pts);

    const area = el('path', {
      d: `${d} L ${W} ${padTop + plotH} L 0 ${padTop + plotH} Z`,
      fill: `url(#${gid})`, opacity: '0',
    });
    area.style.transition = 'opacity 1.2s ease .35s';
    svg.append(area);

    const line = el('path', {
      d, fill: 'none', stroke: spec.color, 'stroke-width': spec.weight || 1.6,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    svg.append(line);
    const len = line.getTotalLength ? line.getTotalLength() : 1000;
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = String(len);
    line.style.transition = 'stroke-dashoffset 1.9s cubic-bezier(.25,.6,.25,1)';

    // end marker
    const last = pts[pts.length - 1];
    const dot = el('circle', { cx: last[0], cy: last[1], r: 3.2, fill: spec.color, opacity: '0' });
    dot.style.transition = 'opacity .5s ease 1.4s';
    svg.append(dot);
    svg.append(el('circle', { cx: last[0], cy: last[1], r: 7.5, fill: 'none', stroke: spec.color, 'stroke-opacity': '.22', opacity: dot.getAttribute('opacity') }));

    const play = () => {
      requestAnimationFrame(() => {
        line.style.strokeDashoffset = '0';
        area.style.opacity = '1';
        dot.style.opacity = '1';
      });
    };
    if (reduce) {
      line.style.transition = area.style.transition = dot.style.transition = 'none';
      line.style.strokeDashoffset = '0'; area.style.opacity = '1'; dot.style.opacity = '1';
      return;
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ens) => {
        ens.forEach((en) => { if (en.isIntersecting) { play(); io.disconnect(); } });
      }, { threshold: 0.2 });
      io.observe(svg);
    } else play();
    svg._replay = play;
  };

  /* ── hero chart ─────────────────────────────────────── */
  const heroKeys = [
    [0, 68], [0.08, 66], [0.16, 63], [0.24, 64], [0.32, 74], [0.4, 92],
    [0.48, 112], [0.55, 124], [0.62, 132], [0.7, 122], [0.78, 106],
    [0.86, 92], [0.94, 80], [1, 74],
  ];
  const heroValues = interp(heroKeys, 64).map((v, i, arr) => {
    const n = rand(7 + i)();
    const edge = Math.min(i, arr.length - 1 - i) / 6;
    return v + (n - 0.5) * 5 * Math.min(1, edge);
  });
  const heroSvg = $('[data-chart="hero"]');
  if (heroSvg) {
    drawChart(heroSvg, {
      id: 'hero', values: heroValues, min: 52, max: 140,
      color: '#1E5645', weight: 1.5,
      bands: [
        { from: 0, to: 0.28, fill: 'rgba(19,23,21,.022)' },
        { from: 0.28, to: 0.78, fill: 'rgba(30,86,69,.045)' },
        { from: 0.78, to: 1, fill: 'rgba(200,183,154,.10)' },
      ],
    });
  }

  /* ── showcase tabs ──────────────────────────────────── */
  const tabs = $$('.tab');
  const figs = ['Fig. 02 — 20인 실시간 관제', 'Fig. 03 — HRV 회복 곡선', 'Fig. 04 — 개인 효과 리포트'];
  const figEl = $('[data-fig]');
  const selectTab = (btn, i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) { panel.hidden = !on; panel.classList.toggle('is-active', on); }
    });
    if (figEl) figEl.innerHTML = figs[i];
    if (focus) tabs[i].focus();
    if (i === 1) {
      const c = $('[data-chart="curve"]');
      if (c && c._replay) setTimeout(c._replay, 60);
    }
  };
  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => selectTab(btn, i));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        selectTab(tabs[next], next, true);
      }
    });
  });

  /* ── curve chart ────────────────────────────────────── */
  const curveSvg = $('[data-chart="curve"]');
  if (curveSvg) {
    const keys = [
      [0, 70], [0.1, 68.5], [0.2, 68], [0.3, 66], [0.4, 64.4], [0.5, 63],
      [0.58, 64], [0.66, 68], [0.74, 74], [0.82, 78.5], [0.9, 81], [1, 82],
    ];
    const vals = interp(keys, 72).map((v, i, arr) => {
      const n = rand(31 + i)();
      return v + (n - 0.5) * 1.8 * Math.min(1, Math.min(i, arr.length - 1 - i) / 8);
    });
    drawChart(curveSvg, {
      id: 'curve', values: vals, min: 58, max: 88, color: '#1E5645', weight: 1.7,
      bands: [
        { from: 0, to: 0.28, fill: 'rgba(19,23,21,.02)' },
        { from: 0.28, to: 0.78, fill: 'rgba(30,86,69,.04)' },
        { from: 0.78, to: 1, fill: 'rgba(200,183,154,.09)' },
      ],
    });
  }

  /* ── live grid ──────────────────────────────────────── */
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
    const colors = { ok: '#2C6A55', watch: '#B08A4A', over: '#9C5148', off: '#B9BDB9' };
    const spark = (base, seed) => {
      const r = rand(seed);
      const vals = Array.from({ length: 14 }, (_, i) => base + Math.sin(i * 0.9 + seed) * 4 + (r() - 0.5) * 5);
      const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
      return vals.map((v, i) => `${((i / (vals.length - 1)) * 60).toFixed(1)},${(15 - ((v - min) / span) * 12).toFixed(1)}`).join(' ');
    };
    rows.forEach(([id, bpm, state, group], i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.innerHTML =
        `<div class="cell__top"><span class="cell__id">${id}</span><i class="dot dot--${state}"></i></div>` +
        `<div class="cell__bpm">${bpm}<span>bpm</span></div>` +
        `<svg class="cell__spark" viewBox="0 0 60 16" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${colors[state]}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" points="${spark(bpm, i + 3)}" opacity=".85"/></svg>` +
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
