// Accolai landing page: the three words. Each one is a toy with its own picture, drawn in white on a
// dark field: a voice that writes notes (Hum), a note you drag around (Shape), a tower of drums (Build).
(() => {
  const A = window.Accolai; if (!A || !window.gsap) return;
  const { audio, hz, singPhrase, LEAD, STEP, barSec, drum } = A;
  const $ = (s, r = document) => r.querySelector(s);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = '#f4f5f7', BLUE = '#5b9cff';
  const FONT = (w) => `500 ${Math.round(Math.max(13, w * 0.022))}px Satoshi, "Helvetica Neue", Arial, sans-serif`;

  // split each word into letters so the CSS can wave them
  document.querySelectorAll('.how-word').forEach((w) => { const txt = w.textContent; w.textContent = ''; [...txt].forEach((ch, n) => { const sp = document.createElement('span'); sp.className = 'l'; sp.textContent = ch; sp.style.setProperty('--n', n); w.appendChild(sp); }); });

  // a canvas that sizes itself, draws only while on screen, and hands pointer events to its toy
  function field(name, toy) {
    const el = $(`.how-field[data-field="${name}"]`); if (!el) return null;
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    let w = 0, h = 0, seen = false;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); w = el.clientWidth; h = el.clientHeight; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    new IntersectionObserver((e) => { seen = e[0].isIntersecting; if (!seen && toy.sleep) toy.sleep(); }).observe(el);
    gsap.ticker.add((t) => { if (!seen) return; if (!w) size(); ctx.clearRect(0, 0, w, h); toy.draw(ctx, w, h, t); });
    const pt = (e) => { const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)), e }; };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); if (toy.down) toy.down(pt(e)); });
    el.addEventListener('pointermove', (e) => { if (toy.move) toy.move(pt(e)); });
    el.addEventListener('pointerup', (e) => { if (toy.up) toy.up(pt(e)); });
    el.addEventListener('pointercancel', (e) => { if (toy.up) toy.up(pt(e)); });
    el.addEventListener('pointerenter', (e) => { if (toy.enter) toy.enter(pt(e)); });
    el.addEventListener('pointerleave', (e) => { if (toy.leave) toy.leave(pt(e)); });
    return el;
  }
  // a button drawn into the picture: white pill, dark glyph and label, a slow pulse while idle
  function button(ctx, w, h, t, { label, glyph, on }) {
    const fs = Math.round(Math.max(14, w * 0.024)), hh = fs * 2.6, pad = w * 0.06;
    ctx.font = `600 ${fs}px "Clash Display", Satoshi, "Helvetica Neue", Arial, sans-serif`; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width, bw = tw + hh * 1.9, x = pad, y = h - pad * 0.7 - hh;
    const pulse = on ? 1 : 1 + Math.sin(t * 3) * 0.012;
    ctx.save(); ctx.translate(x + bw / 2, y + hh / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + bw / 2), -(y + hh / 2));
    ctx.fillStyle = on ? '#5b9cff' : INK; ctx.globalAlpha = 1; rr(ctx, x, y, bw, hh, hh / 2);
    ctx.fillStyle = '#0a0b0f'; const gx = x + hh * 0.62, gy = y + hh / 2, g = fs * 0.5;
    if (glyph === 'play') { ctx.beginPath(); ctx.moveTo(gx - g * 0.5, gy - g * 0.62); ctx.lineTo(gx + g * 0.62, gy); ctx.lineTo(gx - g * 0.5, gy + g * 0.62); ctx.closePath(); ctx.fill(); }
    if (glyph === 'stop') { rr(ctx, gx - g * 0.5, gy - g * 0.5, g, g, 2); }
    if (glyph === 'drag') { ctx.beginPath(); ctx.arc(gx, gy, g * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(gx - g, gy - 1.5, g * 2, 3); ctx.beginPath(); ctx.moveTo(gx - g * 1.25, gy); ctx.lineTo(gx - g * 0.85, gy - g * 0.4); ctx.lineTo(gx - g * 0.85, gy + g * 0.4); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(gx + g * 1.25, gy); ctx.lineTo(gx + g * 0.85, gy - g * 0.4); ctx.lineTo(gx + g * 0.85, gy + g * 0.4); ctx.closePath(); ctx.fill(); }
    if (glyph === 'plus') { ctx.fillRect(gx - g * 0.7, gy - 1.5, g * 1.4, 3); ctx.fillRect(gx - 1.5, gy - g * 0.7, 3, g * 1.4); }
    ctx.fillText(label, x + hh * 1.25, gy + 1);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, Math.max(1, w), Math.max(1, h), r); ctx.fill(); };
  const LO = 62, HI = 74, ROWS = HI - LO + 1;

  /* ---------------- Inside: every feature is a note; hover one and it sounds ---------------- */
  (() => {
    const scale = [60, 62, 64, 67, 69, 72, 74, 76];
    document.querySelectorAll('.feat-lane').forEach((lane, li) => {
      lane.querySelectorAll('li').forEach((el, i) => {
        const midi = scale[(li * 3 + i) % scale.length] + (li === 2 ? -12 : 0);
        const ping = () => { const c = audio(); const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'triangle'; f.type = 'lowpass'; f.frequency.value = 1800; o.frequency.value = hz(midi); o.connect(f); f.connect(g); g.connect(A.master()); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35); o.start(); o.stop(c.currentTime + 0.4); el.classList.add('is-ping'); setTimeout(() => el.classList.remove('is-ping'), 260); };
        el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') ping(); });
        el.addEventListener('click', ping);
      });
    });
  })();

  /* ---------------- Hum: a voice sings, and behind it the notes get written ---------------- */
  (() => {
    const word = $('.how-word[data-fx="hum"]'); const el = $('.how-field[data-field="hum"]'); if (!word || !el) return;
    const S = { on: false, t0: 0, stop: null, timer: 0, wake: 0 };
    const sing = () => {
      if (S.on) return;
      S.on = true; word.classList.add('is-on'); el.classList.add('is-on');
      const c = audio();
      const go = () => { S.t0 = c.currentTime + 0.05; S.stop = singPhrase(LEAD, S.t0, STEP, { octave: 0, level: 0.42 }); S.timer = setTimeout(go, barSec * 1000 + 350); };
      go();
    };
    const hush = () => { if (!S.on) return; S.on = false; clearTimeout(S.timer); if (S.stop) S.stop(); S.stop = null; word.classList.remove('is-on'); el.classList.remove('is-on'); };
    const draw = (ctx, w, h, t) => {
      const pad = w * 0.08, lane = w - pad * 2, top = h * 0.14, bot = h * 0.78;
      const rowH = (bot - top) / ROWS, rowY = (m) => top + (HI - m) * rowH;
      const now = S.on ? audio().currentTime - S.t0 : -1; const prog = now < 0 ? -1 : (now / barSec) % 1;
      // the written notes: faint until the voice has passed them, solid after, lit while they sound
      for (const [st, len, m] of LEAD) {
        const x = pad + (st / 32) * lane, bw = (len / 32) * lane - 4;
        const passed = prog >= 0 && (st / 32) <= prog;
        const live = passed && prog < (st + len) / 32;
        ctx.fillStyle = live ? BLUE : INK; ctx.globalAlpha = live ? 1 : passed ? 0.85 : S.on ? 0.14 : 0.3;
        rr(ctx, x, rowY(m) + 2 + (live ? -2 : 0), bw, rowH - 4 + (live ? 4 : 0), 3);
      }
      ctx.globalAlpha = 1;
      // the voice: a line that breathes; while singing it climbs to the note it sings and a dot travels along it
      let cm = LEAD[0][2], amp = 6, px = pad;
      if (prog >= 0) { for (const [st, len, m] of LEAD) if (prog >= st / 32) cm = m; amp = 14; px = pad + prog * lane; }
      const yv = S.on ? rowY(cm) + rowH / 2 : h * 0.5;
      S.wake += ((S.on ? 1 : 0) - S.wake) * 0.08;
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = 0.55 + S.wake * 0.45;
      ctx.beginPath();
      const N = 90;
      for (let i = 0; i <= N; i++) {
        const u = i / N, x = pad + u * lane; const env = Math.sin(u * Math.PI);
        const wig = Math.sin(u * 30 + t * 6) * 0.5 + Math.sin(u * 11 - t * 2.5) * 0.5;
        const base = S.on ? yv : h * 0.5 + Math.sin(u * 4 + t * 0.6) * 10;
        const y = base + env * amp * wig * (S.on ? Math.max(0, 1 - Math.abs(u - prog) * 3) + 0.25 : 1);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
      if (S.on && prog >= 0) { ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(px, yv, 9 + Math.sin(t * 20) * 1.5, 0, Math.PI * 2); ctx.fill(); }
      button(ctx, w, h, t, { label: S.on ? 'Listening' : 'Play the hum', glyph: S.on ? 'stop' : 'play', on: S.on });
    };
    let pinned = false;
    field('hum', { draw, enter: ({ e }) => { if (e.pointerType === 'mouse') sing(); }, leave: () => { if (!pinned) hush(); }, down: ({ e }) => { if (e.pointerType === 'mouse') { pinned = !pinned; if (pinned) sing(); else hush(); } else { if (S.on) hush(); else sing(); } }, sleep: () => { pinned = false; hush(); } });
    word.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') sing(); });
    word.addEventListener('pointerleave', hush);
    word.addEventListener('click', (e) => { if (e.pointerType === 'mouse' || e.detail === 0) return; if (S.on) hush(); else sing(); });
  })();

  /* ---------------- Shape: one big note you can drag; higher, longer, harder ---------------- */
  (() => {
    const word = $('.how-word[data-fx="shape"]'); const el = $('.how-field[data-field="shape"]'); if (!word || !el) return;
    const N = { x: 0.18, len: 0.42, row: 0.5, vel: 0.8 }, trail = []; let osc = null, g = null, f = null, down = false, idle = null;
    const demo = () => { if (reduced() || idle) return; idle = gsap.timeline({ repeat: -1, repeatDelay: 0.6, defaults: { ease: 'power2.inOut', duration: 0.9 } }).to(N, { len: 0.62, row: 0.3 }).to(N, { len: 0.28, row: 0.7, vel: 1 }).to(N, { len: 0.5, row: 0.45, vel: 0.6 }); };
    demo();
    const set = ({ x, y }) => {
      N.len = Math.max(0.08, x - N.x); N.row = y; N.vel = 0.45 + x * 0.55;
      trail.push({ len: N.len, row: N.row, t: performance.now() }); if (trail.length > 14) trail.shift();
      if (osc) { const c = audio(); osc.frequency.setTargetAtTime(hz(74 - Math.round(y * 6) * 2), c.currentTime, 0.02); f.frequency.setTargetAtTime(500 + N.vel * 2600, c.currentTime, 0.03); }
    };
    const start = (p) => {
      if (down) return; down = true; if (idle) { idle.kill(); idle = null; } word.classList.add('is-on'); el.classList.add('is-on');
      const c = audio(); osc = c.createOscillator(); g = c.createGain(); f = c.createBiquadFilter(); osc.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1200; f.Q.value = 2;
      osc.connect(f); f.connect(g); g.connect(A.master()); g.gain.value = 0.0001; osc.start(); g.gain.exponentialRampToValueAtTime(0.14, c.currentTime + 0.04); set(p);
    };
    const stop = () => {
      if (!down) return; down = false; word.classList.remove('is-on'); el.classList.remove('is-on');
      const c = audio(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12); osc.stop(c.currentTime + 0.15); osc = null;
      setTimeout(() => { if (!down) demo(); }, 1500);
    };
    const draw = (ctx, w, h, t) => {
      const pad = w * 0.06, lane = w - pad * 2, top = h * 0.1, bot = h * 0.8, rows = 7, rowH = (bot - top) / rows;
      for (let r = 0; r < rows; r += 2) { ctx.fillStyle = INK; ctx.globalAlpha = 0.035; ctx.fillRect(pad, top + r * rowH, lane, rowH); }
      ctx.globalAlpha = 1;
      const now = performance.now();
      for (const s of trail) { const age = (now - s.t) / 600; if (age > 1) continue; ctx.fillStyle = INK; ctx.globalAlpha = 0.18 * (1 - age); rr(ctx, pad + N.x * lane, top + Math.round(s.row * (rows - 1)) * rowH + 3, s.len * lane, rowH - 6, 4); }
      const ry = top + Math.round(N.row * (rows - 1)) * rowH;
      ctx.fillStyle = down ? BLUE : INK; ctx.globalAlpha = 0.55 + N.vel * 0.45; rr(ctx, pad + N.x * lane, ry + 3, N.len * lane, rowH - 6, 4);
      ctx.globalAlpha = 1; ctx.fillStyle = '#0a0b0f'; ctx.beginPath(); ctx.arc(pad + (N.x + N.len) * lane - rowH * 0.45, ry + rowH / 2, rowH * 0.18 + (down ? 2 : Math.sin(t * 3) + 1), 0, Math.PI * 2); ctx.fill();
      button(ctx, w, h, t, { label: down ? 'Up is higher, right is longer' : 'Drag the note', glyph: 'drag', on: down });
    };
    field('shape', { draw, down: start, move: (p) => { if (down) set(p); }, up: stop, sleep: stop });
    word.addEventListener('pointerdown', (e) => { e.preventDefault(); word.setPointerCapture(e.pointerId); start({ x: 0.6, y: 0.5 }); });
    word.addEventListener('pointermove', (e) => { if (down) { const r = el.getBoundingClientRect(); set({ x: Math.max(0.2, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }); } });
    word.addEventListener('pointerup', stop); word.addEventListener('pointercancel', stop);
  })();

  /* ---------------- Build: every tap drops a drum into the tower; eight of them play ---------------- */
  (() => {
    const word = $('.how-word[data-fx="build"]'); const el = $('.how-field[data-field="build"]'); if (!word || !el) return;
    const order = ['k', 'h', 's', 'h', 'k', 'k', 's', 'h'], size = { k: 3, s: 2, h: 1 };
    const blocks = []; let count = 0, playing = false, head = -1;
    const hit = () => {
      if (playing) return;
      const kind = order[count % 8], c = audio(); drum(kind, c.currentTime);
      const b = { col: count, kind, y: -1, scale: 1, alpha: 1 }; blocks.push(b);
      gsap.to(b, { y: 0, duration: reduced() ? 0 : 0.7, ease: 'bounce.out' });
      word.classList.add('is-hit'); setTimeout(() => word.classList.remove('is-hit'), 120);
      el.classList.add('is-on'); setTimeout(() => el.classList.remove('is-on'), 120);
      count++;
      if (count === 8) {
        playing = true; const t0 = c.currentTime + 0.4, step = 0.25;
        for (let rep = 0; rep < 2; rep++) order.forEach((k, n) => { const at = t0 + rep * 2 + n * step; drum(k, at); setTimeout(() => { head = n; const bl = blocks[n]; if (bl) gsap.fromTo(bl, { scale: 1.18 }, { scale: 1, duration: 0.25, ease: 'power2.out' }); }, (at - c.currentTime) * 1000); });
        setTimeout(() => { head = -1; blocks.forEach((b, i) => gsap.to(b, { y: 1.4, alpha: 0, duration: 0.6, delay: i * 0.04, ease: 'power2.in' })); setTimeout(() => { blocks.length = 0; count = 0; playing = false; }, 1100); }, 4500);
      }
    };
    const draw = (ctx, w, h, t) => {
      const pad = w * 0.06, lane = w - pad * 2, cols = 8, gap = Math.max(4, w * 0.012), cw = (lane - gap * 7) / cols, top = h * 0.1, floor = h * 0.8, rowH = (floor - top) / 4;
      for (let i = 0; i < cols; i++) { ctx.fillStyle = INK; ctx.globalAlpha = head === i ? 0.12 : 0.04; ctx.fillRect(pad + i * (cw + gap), top, cw, floor - top); }
      if (!blocks.length) order.forEach((k, i) => { const hh = size[k] * rowH - 4, x = pad + i * (cw + gap), bob = Math.sin(t * 2.2 + i * 0.8) * 6; ctx.fillStyle = INK; ctx.globalAlpha = 0.07 + (Math.sin(t * 2.2 + i * 0.8) + 1) * 0.02; rr(ctx, x, floor - hh + bob, cw, hh, 4); });
      for (const b of blocks) {
        const hh = size[b.kind] * rowH - 4; const x = pad + b.col * (cw + gap); const y = floor - hh + b.y * (floor - top + hh);
        ctx.fillStyle = head === b.col ? BLUE : INK; ctx.globalAlpha = head === b.col ? b.alpha : b.alpha * (b.kind === 'k' ? 1 : b.kind === 's' ? 0.75 : 0.5);
        ctx.save(); ctx.translate(x + cw / 2, y + hh); ctx.scale(b.scale, b.scale); rr(ctx, -cw / 2, -hh, cw, hh, 4); ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (head >= 0) { ctx.fillStyle = BLUE; ctx.globalAlpha = 1; ctx.fillRect(pad + head * (cw + gap), floor + 8, cw, 4); ctx.globalAlpha = 1; }
      if (!playing && count < 8) { const x = pad + count * (cw + gap); ctx.fillStyle = INK; ctx.globalAlpha = 0.25 + Math.sin(t * 4) * 0.12; rr(ctx, x + cw * 0.3, top - 8 + Math.sin(t * 4) * 4, cw * 0.4, 8, 2); ctx.globalAlpha = 1; }
      button(ctx, w, h, t, { label: playing ? 'Playing your beat' : count ? `Drop a drum, ${8 - count} to go` : 'Drop a drum', glyph: playing ? 'play' : 'plus', on: playing });
    };
    field('build', { draw, down: hit });
    word.addEventListener('click', hit);
  })();
})();
