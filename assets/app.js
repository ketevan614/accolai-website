// Accolai landing page: the field of sound (drag to play, hum to write), fit-to-width wordmarks, reveals.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- fit a word to its container ---------------- */
  function fit(el) {
    const parent = el.parentElement, cs = getComputedStyle(parent);
    const target = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!target) return;
    el.style.fontSize = '100px';
    let inner = el; while (inner.firstElementChild && inner.firstElementChild.textContent.trim() === inner.textContent.trim()) inner = inner.firstElementChild;
    const range = document.createRange(); range.selectNodeContents(inner);
    const w = range.getBoundingClientRect().width; if (!w) return;
    let size = Math.floor(100 * target / w * 0.985);
    el.style.fontSize = size + 'px';
  }
  function fitAll() { $$('[data-fit]').forEach(fit); }
  if (document.fonts) document.fonts.ready.then(fitAll); else fitAll();
  addEventListener('resize', fitAll); addEventListener('load', fitAll);

  /* ---------------- reveal once ---------------- */
  const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal]').forEach((el) => io.observe(el));

  /* ---------------- phone menu ---------------- */
  const toggle = $('.menu-toggle'), menu = $('#phone-menu');
  if (toggle && menu) {
    const set = (open) => { menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); toggle.textContent = open ? 'Close' : 'Menu'; };
    toggle.addEventListener('click', () => set(menu.hidden));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  /* ======================================================================
     THE SKY OF NOTES: coloured notes fly through the hero. Drag to throw a melody, tap a note to pop it, hum to send your own up.
     ====================================================================== */
  const field = $('#field'), canvas = $('#field-canvas'), hint = $('#field-hint'), btnHum = $('#btn-hum'), btnPlay = $('#btn-play');
  if (!field || !canvas) return;
  const ctx2d = canvas.getContext('2d');
  const COLORS = ['#ff5c4d', '#ffd23f', '#3fa9ff', '#3ddc97', '#ff7ab6', '#ff9b3d'];
  const GLYPHS = ['♪', '♫', '♩', '♬']; // the subject's own symbols: taste-skill-ignore
  const LOW = 55, HIGH = 79;
  const SCALE = [0, 2, 4, 7, 9];
  let W = 0, H = 0, dpr = 1;
  let pointer = { x: -1e4, y: -1e4, down: false };
  const notes = [], sparks = [];
  function size() { dpr = Math.min(2, devicePixelRatio || 1); W = field.clientWidth; H = field.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); addEventListener('resize', size);
  const snap = (m) => { const o = Math.floor(m / 12) * 12; let best = m, d = 99; for (const s of SCALE) for (const k of [o - 12, o, o + 12]) { const q = k + s; if (Math.abs(q - m) < d) { d = Math.abs(q - m); best = q; } } return Math.max(LOW, Math.min(HIGH, best)); };
  const yToMidi = (y) => snap(LOW + (1 - y / H) * (HIGH - LOW));
  const colorOf = (midi) => COLORS[midi % COLORS.length];
  function spawn(x, y, midi, opts = {}) {
    const n = { x, y, vx: (Math.random() - 0.5) * 1.2 + (opts.vx || 0), vy: -(0.4 + Math.random() * 0.6) + (opts.vy || 0), rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 0.02, s: opts.s || (28 + Math.random() * 42), c: colorOf(midi), g: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], midi, born: performance.now(), pop: 0, ph: Math.random() * 6.28 };
    notes.push(n); if (notes.length > 70) notes.shift(); return n;
  }
  function burst(n) { for (let i = 0; i < 10; i++) sparks.push({ x: n.x, y: n.y, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.8) * 9, c: n.c, life: 1 }); n.pop = 1; }
  // ambient drift: a few notes always rising
  for (let i = 0; i < 14; i++) spawn(Math.random() * W, Math.random() * H, LOW + Math.floor(Math.random() * 24));
  let lastAmbient = 0;
  function draw(now) {
    ctx2d.clearRect(0, 0, W, H);
    if (now - lastAmbient > 650 && notes.length < 40) { lastAmbient = now; spawn(Math.random() * W, H + 40, LOW + Math.floor(Math.random() * 24)); }
    ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      n.x += n.vx + Math.sin(now * 0.001 + n.ph) * 0.35; n.y += n.vy; n.rot += n.vr; n.vy *= 0.995; n.vx *= 0.995;
      const dx = n.x - pointer.x, dy = n.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < 22000) { const d = Math.sqrt(d2) || 1, f = (1 - d / 148) * 1.6; n.vx += dx / d * f; n.vy += dy / d * f; }
      if (n.pop) { n.pop += 0.12; }
      const scale = n.pop ? 1 + n.pop * 0.6 : 1, alpha = n.pop ? Math.max(0, 1 - n.pop * 0.9) : Math.min(1, (now - n.born) / 400);
      if (n.y < -80 || n.x < -80 || n.x > W + 80 || alpha <= 0) { notes.splice(i, 1); continue; }
      ctx2d.save(); ctx2d.translate(n.x, n.y); ctx2d.rotate(n.rot); ctx2d.scale(scale, scale); ctx2d.globalAlpha = alpha; ctx2d.fillStyle = n.c;
      ctx2d.font = `${n.s}px "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", serif`; ctx2d.fillText(n.g, 0, 0); ctx2d.restore();
    }
    for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.03; if (p.life <= 0) { sparks.splice(i, 1); continue; } ctx2d.globalAlpha = p.life; ctx2d.fillStyle = p.c; ctx2d.beginPath(); ctx2d.arc(p.x, p.y, 3 + p.life * 3, 0, 6.283); ctx2d.fill(); }
    ctx2d.globalAlpha = 1;
    if (!reduced()) raf = requestAnimationFrame(draw); else raf = 0;
  }
  let raf = 0;
  const start = () => { if (!raf) raf = requestAnimationFrame(draw); };
  if (!reduced()) start(); else draw(performance.now());
  new IntersectionObserver((e) => { if (e[0].isIntersecting) start(); else { cancelAnimationFrame(raf); raf = 0; } }).observe(field);

  /* ---------------- sound ---------------- */
  let ac = null, master = null;
  function audio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.45;
    const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    return ac;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function voice(midi, when, dur, v = 0.8) {
    const c = audio();
    const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), g2 = c.createGain();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = hz(midi); o2.frequency.value = hz(midi) * 2.003; g2.gain.value = 0.25;
    f.type = 'lowpass'; f.frequency.value = 1600 + v * 2600; f.Q.value = 0.8;
    const peak = 0.22 * v;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    g.gain.exponentialRampToValueAtTime(peak * 0.5, when + Math.max(0.08, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.25);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(master);
    o1.start(when); o2.start(when); o1.stop(when + dur + 0.3); o2.stop(when + dur + 0.3);
  }

  /* ---------------- drag: throw a melody into the sky ---------------- */
  const melody = []; let lastThrow = 0, lastMidi = -1;
  function throwNote(x, y) {
    const now = performance.now(); if (now - lastThrow < 70) return; lastThrow = now;
    const m = yToMidi(y);
    const n = spawn(x, y, m, { vy: -2.5 - Math.random() * 2, vx: (Math.random() - 0.5) * 3, s: 44 + Math.random() * 30 });
    if (m !== lastMidi) voice(m, audio().currentTime, 0.22, 0.75);
    lastMidi = m; melody.push({ t: now, midi: m, x: x / W });
    btnPlay.hidden = false; hint.textContent = 'That is a melody. Play it back, or keep throwing.';
  }
  field.addEventListener('pointermove', (e) => { const r = field.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; if (pointer.down) throwNote(pointer.x, pointer.y); });
  field.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.field-ui') || humming) return;
    const r = field.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    // tap a note: pop it
    let hit = null; for (const n of notes) { if (!n.pop && Math.hypot(n.x - x, n.y - y) < n.s * 0.6) { hit = n; } }
    if (hit) { burst(hit); voice(hit.midi, audio().currentTime, 0.3, 0.9); start(); return; }
    stopPlay(); pointer.down = true; pointer.x = x; pointer.y = y; lastMidi = -1; melody.length = 0; field.setPointerCapture(e.pointerId); throwNote(x, y); start();
  });
  const up = () => { pointer.down = false; };
  field.addEventListener('pointerup', up); field.addEventListener('pointercancel', up);
  field.addEventListener('pointerleave', () => { pointer.x = -1e4; pointer.y = -1e4; });

  /* ---------------- play it back ---------------- */
  let playTimers = [];
  function stopPlay() { playTimers.forEach(clearTimeout); playTimers = []; btnPlay.setAttribute('aria-pressed', 'false'); }
  function play() {
    if (!melody.length) return; stopPlay(); btnPlay.setAttribute('aria-pressed', 'true');
    const c = audio(), t0 = melody[0].t, at = c.currentTime + 0.1; let lastM = -1;
    melody.forEach((m, i) => {
      const dt = Math.min((m.t - t0) / 1000, 12);
      if (m.midi !== lastM || i === 0) voice(m.midi, at + dt, 0.25, 0.8);
      lastM = m.midi;
      playTimers.push(setTimeout(() => { spawn(m.x * W, H * (1 - (m.midi - LOW) / (HIGH - LOW)), m.midi, { vy: -2.5, s: 52 }); start(); }, (0.1 + dt) * 1000));
    });
    playTimers.push(setTimeout(() => { stopPlay(); hint.textContent = 'Throw another, or hum one.'; }, (0.4 + Math.min((melody[melody.length - 1].t - t0) / 1000, 12)) * 1000));
  }
  btnPlay.addEventListener('click', () => (playTimers.length ? stopPlay() : play()));

  /* ---------------- hum: your voice sends notes up ---------------- */
  let humming = false, stream = null, analyser = null, humRaf = 0, buf = null;
  function detect(data, sr) {
    let rms = 0; for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
    rms = Math.sqrt(rms / data.length); if (rms < 0.012) return -1;
    const N = data.length; let best = -1, bestCorr = 0;
    const minLag = Math.floor(sr / 1000), maxLag = Math.floor(sr / 70);
    for (let lag = minLag; lag < maxLag; lag++) { let c = 0; for (let i = 0; i < N - lag; i++) c += data[i] * data[i + lag]; c /= (N - lag); if (c > bestCorr && lag > minLag + 2) { bestCorr = c; best = lag; } }
    if (best < 0 || bestCorr < rms * rms * 0.3) return -1;
    return sr / best;
  }
  async function startHum() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } }); }
    catch { hint.textContent = 'No microphone. Drag across the sky instead.'; return; }
    const c = audio(); stopPlay();
    analyser = c.createAnalyser(); analyser.fftSize = 2048; buf = new Float32Array(analyser.fftSize);
    c.createMediaStreamSource(stream).connect(analyser);
    humming = true; btnHum.setAttribute('aria-pressed', 'true'); melody.length = 0;
    hint.textContent = 'Listening. Hum a line for four seconds.';
    const start0 = performance.now(); let stable = [], lastSpawn = 0;
    const loop = () => {
      if (!humming) return;
      analyser.getFloatTimeDomainData(buf);
      const f = detect(buf, c.sampleRate); const now = performance.now(); const x = ((now - start0) / 4000) * W;
      if (f > 0) {
        let m = Math.round(69 + 12 * Math.log2(f / 440)); while (m < LOW) m += 12; while (m > HIGH) m -= 12;
        stable.push(m); if (stable.length > 3) stable.shift();
        if (stable.length === 3 && stable.every((v) => v === m) && now - lastSpawn > 90) { lastSpawn = now; spawn(x, H * (1 - (m - LOW) / (HIGH - LOW)), m, { vy: -1.5, s: 46 }); melody.push({ t: now, midi: m, x: x / W }); }
      } else stable = [];
      if (now - start0 >= 4000) { stopHum(); if (melody.length) { btnPlay.hidden = false; hint.textContent = 'Got it. Playing it back.'; setTimeout(play, 300); } else hint.textContent = 'Nothing heard. Try closer to the mic, or drag instead.'; return; }
      humRaf = requestAnimationFrame(loop);
    };
    humRaf = requestAnimationFrame(loop);
  }
  function stopHum() { humming = false; cancelAnimationFrame(humRaf); if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } btnHum.setAttribute('aria-pressed', 'false'); }
  btnHum.addEventListener('click', () => (humming ? stopHum() : startHum()));
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { btnHum.disabled = true; btnHum.title = 'Needs a microphone'; }

  /* ======================================================================
     THE THREE WORDS: each one is a toy
     ====================================================================== */
  const PAL = ['#ff5c4d', '#ffd23f', '#3fa9ff', '#3ddc97', '#ff7ab6', '#ff9b3d'];
  $$('.monument [data-line], .foot-word').forEach((w) => { const pal = w.classList.contains('foot-word') ? ['#ff5c4d', '#ffd23f', '#3ddc97', '#ff7ab6', '#ff9b3d', '#08090b'] : PAL; const txt = w.textContent.trim(); w.textContent = ''; [...txt].forEach((ch, n) => { const sp = document.createElement('span'); sp.className = 'c'; sp.textContent = ch; sp.style.color = pal[n % pal.length]; sp.style.setProperty('--n', n); w.appendChild(sp); }); });
  $$('.monument .c').forEach((sp, n) => sp.addEventListener('pointerenter', () => { sp.classList.remove('is-bop'); void sp.offsetWidth; sp.classList.add('is-bop'); voice(60 + [0, 2, 4, 7, 9, 12, 14][n % 7], audio().currentTime, 0.25, 0.7); }));
  $$('.bubble').forEach((b, i) => { b.style.background = PAL[i % PAL.length]; b.style.color = '#08090b'; });
  $$('.how-word').forEach((w, i) => { w.style.color = PAL[i * 2 % PAL.length]; });
  $$('.how-word').forEach((w) => { const txt = w.textContent; w.textContent = ''; [...txt].forEach((ch, n) => { const sp = document.createElement('span'); sp.className = 'l'; sp.textContent = ch; sp.style.setProperty('--n', n); w.appendChild(sp); }); });

  // Hum: the word sways and a voice slides through a little phrase
  const humWord = $('.how-word[data-fx="hum"]');
  if (humWord) {
    let humOsc = null, humGain = null, humOff = 0;
    const sing = () => {
      const c = audio(); if (humOsc) return;
      humOsc = c.createOscillator(); humGain = c.createGain(); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      humOsc.type = 'triangle'; humGain.gain.value = 0.0001;
      humOsc.connect(f); f.connect(humGain); humGain.connect(master); humOsc.start();
      humGain.gain.exponentialRampToValueAtTime(0.16, c.currentTime + 0.08);
      const phrase = [64, 67, 69, 67, 64, 62, 64, 69, 71, 67];
      let i = 0; const next = () => { if (!humOsc) return; humOsc.frequency.exponentialRampToValueAtTime(hz(phrase[i % phrase.length]), c.currentTime + 0.18); i++; humOff = setTimeout(next, 260); }; next();
      humWord.classList.add('is-on');
    };
    const hush = () => { if (!humOsc) return; const c = audio(); clearTimeout(humOff); humGain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.2); humOsc.stop(c.currentTime + 0.25); humOsc = null; humWord.classList.remove('is-on'); };
    humWord.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') sing(); });
    humWord.addEventListener('pointerleave', hush);
    humWord.addEventListener('click', (e) => { if (e.pointerType === 'mouse' || e.detail === 0) return; humOsc ? hush() : sing(); });
  }

  // Shape: drag across the word to stretch it; the note bends with it
  const shapeWord = $('.how-word[data-fx="shape"]');
  if (shapeWord) {
    let osc = null, g = null, down = false;
    const bend = (e) => { const r = shapeWord.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); shapeWord.style.transform = `scaleX(${0.6 + x * 1.1}) scaleY(${1.3 - y * 0.6})`; if (osc) osc.frequency.setTargetAtTime(hz(57 + x * 19), audio().currentTime, 0.03); };
    shapeWord.addEventListener('pointerdown', (e) => { down = true; shapeWord.setPointerCapture(e.pointerId); shapeWord.classList.add('is-on'); const c = audio(); osc = c.createOscillator(); g = c.createGain(); osc.type = 'sawtooth'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; osc.connect(f); f.connect(g); g.connect(master); g.gain.value = 0.0001; osc.start(); g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.05); bend(e); });
    shapeWord.addEventListener('pointermove', (e) => { if (down) bend(e); });
    const release = () => { if (!down) return; down = false; shapeWord.classList.remove('is-on'); shapeWord.style.transform = ''; const c = audio(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.15); osc.stop(c.currentTime + 0.2); osc = null; };
    shapeWord.addEventListener('pointerup', release); shapeWord.addEventListener('pointercancel', release);
  }

  // Build: every tap stacks a block and plays a drum; eight blocks play back as a beat
  const buildWord = $('.how-word[data-fx="build"]'), stack = $('#how-stack');
  if (buildWord && stack) {
    const noise = (c, when, secs, hp, vol, curve) => { const n = c.createBufferSource(); const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, curve); n.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const gg = c.createGain(); gg.gain.value = vol; n.connect(f); f.connect(gg); gg.connect(master); n.start(when); };
    const drum = (kind, when) => {
      const c = audio();
      if (kind === 'hat') { noise(c, when, 0.05, 6000, 0.25, 3); return; }
      const o = c.createOscillator(), gg = c.createGain(); o.connect(gg); gg.connect(master);
      if (kind === 'kick') { o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.18); gg.gain.setValueAtTime(0.7, when); gg.gain.exponentialRampToValueAtTime(0.0001, when + 0.3); o.start(when); o.stop(when + 0.32); }
      else { o.type = 'triangle'; o.frequency.setValueAtTime(220, when); o.frequency.exponentialRampToValueAtTime(120, when + 0.1); gg.gain.setValueAtTime(0.35, when); gg.gain.exponentialRampToValueAtTime(0.0001, when + 0.18); o.start(when); o.stop(when + 0.2); noise(c, when, 0.12, 1500, 0.3, 2); }
    };
    const order = ['kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat'];
    let count = 0, playing = false;
    buildWord.addEventListener('click', () => {
      if (playing) return;
      const kind = order[count % order.length];
      drum(kind, audio().currentTime);
      const i = document.createElement('i'); i.className = kind; stack.appendChild(i);
      buildWord.classList.add('is-hit'); setTimeout(() => buildWord.classList.remove('is-hit'), 120);
      count++;
      if (count === 8) {
        playing = true; const c = audio(); const t0 = c.currentTime + 0.3;
        for (let rep = 0; rep < 2; rep++) order.forEach((k, n) => { drum(k, t0 + rep * 2 + n * 0.25); setTimeout(() => { const el = stack.children[n]; if (el) { el.style.transform = 'translateY(-8px)'; setTimeout(() => { el.style.transform = ''; }, 120); } }, (0.3 + rep * 2 + n * 0.25) * 1000); });
        setTimeout(() => { stack.innerHTML = ''; count = 0; playing = false; }, 4600);
      }
    });
  }


  /* ======================================================================
     BUBBLES: the features as things that float, bump and sound
     ====================================================================== */
  const box = $('#bubbles');
  if (box) {
    const els = $$('.bubble', box);
    const PENT = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
    const B = els.map((el, i) => ({ el, x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, r: 0, midi: PENT[i % PENT.length], hit: 0 }));
    let bw = 0, bh = 0, running = false, raf2 = 0, pointerB = { x: -1e4, y: -1e4, vx: 0, vy: 0 };
    const measure = () => { bw = box.clientWidth; bh = box.clientHeight; for (const b of B) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; b.r = b.h / 2; } };
    const place = () => { for (const b of B) { b.x = b.el.offsetLeft; b.y = b.el.offsetTop; } box.classList.add('is-live'); measure(); B.forEach((b, i) => { b.vx = (Math.random() - 0.5) * 6; b.vy = -3 - Math.random() * 5; }); };
    const ping = (b, v = 0.6) => { voice(b.midi, audio().currentTime, 0.25, v); b.el.classList.add('is-hit'); b.el.style.transform += ' scale(1.08)'; clearTimeout(b.hit); b.hit = setTimeout(() => b.el.classList.remove('is-hit'), 220); };
    let soundOK = false; // only after the visitor has touched the page
    addEventListener('pointerdown', () => { soundOK = true; }, { once: true });
    function step() {
      if (!running) { raf2 = 0; return; }
      for (const b of B) {
        b.vy += 0.18; b.vx *= 0.995; b.vy *= 0.995;
        // the pointer shoves
        const px = pointerB.x - (b.x + b.w / 2), py = pointerB.y - (b.y + b.h / 2), pd = Math.hypot(px, py);
        if (pd < b.w / 2 + 40) { const f = (1 - pd / (b.w / 2 + 40)) * 2.2; b.vx -= px / (pd || 1) * f + pointerB.vx * 0.05; b.vy -= py / (pd || 1) * f + pointerB.vy * 0.05; }
        b.x += b.vx; b.y += b.vy;
        if (b.y + b.h > bh) { b.y = bh - b.h; if (b.vy > 2.2 && soundOK) ping(b, Math.min(0.9, b.vy / 12)); b.vy *= -0.45; b.vx *= 0.92; }
        if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * 0.5; }
        if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.6; } if (b.x + b.w > bw) { b.x = bw - b.w; b.vx = -Math.abs(b.vx) * 0.6; }
      }
      // bubbles bump each other (circles of the smaller radius, stretched for width)
      for (let i = 0; i < B.length; i++) for (let k = i + 1; k < B.length; k++) {
        const a = B[i], c = B[k];
        const ax = a.x + a.w / 2, ay = a.y + a.h / 2, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const dx = cx - ax, dy = cy - ay; const minX = (a.w + c.w) / 2 + 6, minY = (a.h + c.h) / 2 + 4;
        if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
          const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
          if (ox < oy) { const s = Math.sign(dx) || 1; a.x -= s * ox / 2; c.x += s * ox / 2; const t = a.vx; a.vx = c.vx * 0.9; c.vx = t * 0.9; }
          else { const s = Math.sign(dy) || 1; a.y -= s * oy / 2; c.y += s * oy / 2; const t = a.vy; a.vy = c.vy * 0.9; c.vy = t * 0.9; }
        }
      }
      for (const b of B) b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) rotate(${b.vx * 1.2}deg)`;
      pointerB.vx *= 0.8; pointerB.vy *= 0.8;
      raf2 = requestAnimationFrame(step);
    }
    const go = () => { if (!raf2 && !reduced()) { running = true; raf2 = requestAnimationFrame(step); } };
    let dropped = false;
    new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { if (!dropped) { dropped = true; if (reduced()) return; place(); if (soundOK) B.forEach((b, i) => setTimeout(() => ping(b, 0.35), 200 + i * 90)); } go(); }
      else { running = false; }
    }, { threshold: 0.2 }).observe(box);
    addEventListener('resize', () => { if (dropped) measure(); });
    let lp = null;
    box.addEventListener('pointermove', (e) => { const r = box.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; if (lp) { pointerB.vx = x - lp.x; pointerB.vy = y - lp.y; } lp = { x, y }; pointerB.x = x; pointerB.y = y; });
    box.addEventListener('pointerleave', () => { pointerB.x = -1e4; pointerB.y = -1e4; lp = null; });
    els.forEach((el, i) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); const b = B[i]; b.vy = -9 - Math.random() * 4; b.vx += (Math.random() - 0.5) * 8; ping(b, 0.8); }));
  }

  if (window.Stage) { Stage.smooth(); Stage.init(); }

})();
