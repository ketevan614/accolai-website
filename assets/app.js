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
  $$('.feat-col').forEach((col) => $$('li', col).forEach((li, k) => li.style.setProperty('--k', k)));

  /* ---------------- phone menu ---------------- */
  const toggle = $('.menu-toggle'), menu = $('#phone-menu');
  if (toggle && menu) {
    const set = (open) => { menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); toggle.textContent = open ? 'Close' : 'Menu'; };
    toggle.addEventListener('click', () => set(menu.hidden));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  /* ======================================================================
     PIXEL ROBOTS: drawn as pixel grids. b body · d dark · w white · e eye · g visor · l light · a antenna
     ====================================================================== */
  const BEATBOT = [
    '.......a........',
    '.......a........',
    '.....bbbbbb.....',
    '....bbbbbbbb....',
    '.ww.bggggggb.ww.',
    '.wwbbgeggegbbww.',
    '.ww.bggggggb.ww.',
    '....bbbbbbbb....',
    '.....bbbbbb.....',
    '......dddd......',
    '....bbbbbbbb....',
    '...bbllllllbb...',
    '...bblddddlbb...',
    '...bbllllllbb...',
    '....bbbbbbbb....',
    '.....dd..dd.....',
    '.....dd..dd.....',
    '....ddd..ddd....',
  ];
  const BASSBOT = [
    '......a.a.......',
    '.......a........',
    '....bbbbbbbb....',
    '...bbbbbbbbbb...',
    '...bggggggggb...',
    '...bgeggggegb...',
    '...bggggggggb...',
    '...bbbbbbbbbb...',
    '....bbllllbb....',
    '......dddd......',
    '...bbbbbbbbbb...',
    '..bbbdbbbbdbbb..',
    '..bbbbdbbdbbbb..',
    '..bbbbbddbbbbb..',
    '...bbbbbbbbbb...',
    '....dd....dd....',
    '....dd....dd....',
    '...ddd....ddd...',
  ];
  function makeRobot(map, body) {
    const pal = { b: body, d: '#0a0b0f', w: '#f4f5f7', e: '#f4f5f7', g: '#15171d', l: 'rgba(255,255,255,0.35)', a: '#f4f5f7' };
    const H = map.length, W = map[0].length;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W + 4} ${H + 2}`); svg.setAttribute('shape-rendering', 'crispEdges');
    const groups = { body: document.createElementNS(ns, 'g'), eyes: document.createElementNS(ns, 'g'), armL: document.createElementNS(ns, 'g'), armR: document.createElementNS(ns, 'g'), jet: document.createElementNS(ns, 'g') };
    groups.eyes.setAttribute('class', 'eyes'); groups.armL.setAttribute('class', 'arm arm-l'); groups.armR.setAttribute('class', 'arm arm-r'); groups.jet.setAttribute('class', 'jet');
    const px = (g, x, y, c, w = 1, h = 1) => { const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('fill', c); g.appendChild(r); };
    map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; px(ch === 'e' ? groups.eyes : groups.body, x + 2, y, pal[ch]); }));
    // arms: two pixels wide, hanging from the shoulders
    px(groups.armL, 0, 10, body, 2, 4); px(groups.armL, 0, 14, '#f4f5f7', 2, 1);
    px(groups.armR, W + 2, 10, body, 2, 4); px(groups.armR, W + 2, 14, '#f4f5f7', 2, 1);
    // thruster flame under the feet
    px(groups.jet, 6, H, '#ffb547', 2, 1); px(groups.jet, 12, H, '#ffb547', 2, 1); px(groups.jet, 7, H + 1, '#ff7a3d', 1, 1); px(groups.jet, 13, H + 1, '#ff7a3d', 1, 1);
    Object.values(groups).forEach((g) => svg.appendChild(g));
    return svg;
  }
  window.makeRobot = makeRobot; window.BEATBOT = BEATBOT; window.BASSBOT = BASSBOT;
  $$('.agent').forEach((el) => { el.innerHTML = ''; el.appendChild(makeRobot(el.classList.contains('agent-a') ? BEATBOT : BASSBOT, el.classList.contains('agent-a') ? '#ffb547' : '#48d6a8')); });

  /* ======================================================================
     THE OPENING: a hum comes in, becomes notes, an agent lays a beat, another adds a bass, it plays.
     Runs silently on load; "Hear it" runs it again with sound.
     ====================================================================== */
  const story = $('#story'), wave = $('#story-wave'), laneLead = $('#lane-lead'), laneBeat = $('#lane-beat'), laneBass = $('#lane-bass');
  const head = $('#playhead'), agentA = $('#agent-a'), agentB = $('#agent-b'), caps = $$('.cap'), btnHear = $('#btn-hear'), btnAgain = $('#btn-again');
  if (!story || !window.gsap) return;
  const STEPS = 32, BPM = 112, STEP = 60 / BPM / 4;
  // the phrase, as the app would write it: [step, length, midi]
  const LEAD = [[0, 2, 67], [2, 2, 69], [4, 4, 71], [8, 2, 69], [10, 2, 67], [12, 4, 64], [16, 2, 67], [18, 2, 71], [20, 4, 74], [24, 2, 71], [26, 2, 69], [28, 4, 67]];
  const LEAD_RANGE = [62, 74];
  const BEAT = [[0, 'k'], [4, 'h'], [6, 'h'], [8, 's'], [12, 'h'], [14, 'k'], [16, 'k'], [20, 'h'], [22, 'h'], [24, 's'], [28, 'h'], [30, 'k']];
  const BASS = [[0, 4, 43], [4, 4, 43], [8, 4, 45], [12, 4, 45], [16, 4, 40], [20, 4, 40], [24, 4, 43], [28, 4, 43]];
  const RESHAPE = [[2, 71], [8, 71]]; // the second agent lifts two notes

  const mk = (lane, step, len, row, rows, cls) => { const el = document.createElement('i'); el.className = 'blk ' + cls; el.style.left = (step / STEPS * 100) + '%'; el.style.width = `calc(${len / STEPS * 100}% - 3px)`; el.style.top = (row / rows * 100) + '%'; el.style.height = `calc(${100 / rows}% - 3px)`; lane.appendChild(el); return el; };
  const leadEls = LEAD.map(([s, l, m]) => mk(laneLead, s, l, LEAD_RANGE[1] - m, LEAD_RANGE[1] - LEAD_RANGE[0] + 1, 'lead'));
  const beatEls = BEAT.map(([s, k]) => mk(laneBeat, s, 1.2, k === 'k' ? 2 : k === 's' ? 1 : 0, 3, 'beat beat-' + k));
  const bassEls = BASS.map(([s, l, m]) => mk(laneBass, s, l, 45 - m, 6, 'bass'));

  // the wave: a line that breathes while someone hums
  const wctx = wave.getContext('2d'); let ww = 0, wh = 0;
  const wsize = () => { const d = Math.min(2, devicePixelRatio || 1); ww = story.clientWidth; wh = story.clientHeight; wave.width = ww * d; wave.height = wh * d; wctx.setTransform(d, 0, 0, d, 0, 0); };
  wsize(); addEventListener('resize', wsize);
  const W = { amp: 0, alpha: 0, t: 0 };
  function drawWave() {
    wctx.clearRect(0, 0, ww, wh); if (W.alpha <= 0.01) return;
    const y0 = wh * 0.42; wctx.globalAlpha = W.alpha; wctx.strokeStyle = '#f4f5f7'; wctx.lineWidth = 2.5; wctx.lineCap = 'round';
    wctx.beginPath();
    for (let x = 0; x <= ww; x += 4) { const u = x / ww; const env = Math.sin(u * Math.PI); const y = y0 + env * W.amp * (Math.sin(u * 42 + W.t * 7) * 0.5 + Math.sin(u * 17 - W.t * 3) * 0.35 + Math.sin(u * 91 + W.t * 11) * 0.15); if (x === 0) wctx.moveTo(x, y); else wctx.lineTo(x, y); }
    wctx.stroke(); wctx.globalAlpha = 1;
  }
  gsap.ticker.add((t) => { W.t = t; drawWave(); });

  /* ---------------- sound ---------------- */
  let ac = null, master = null;
  function audio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.5;
    const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    return ac;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function voice(midi, when, dur, v = 0.8, kind = 'lead') {
    const c = audio();
    const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), g2 = c.createGain();
    if (kind === 'bass') { o1.type = 'sawtooth'; o2.type = 'square'; f.frequency.value = 420; } else { o1.type = 'triangle'; o2.type = 'sine'; f.frequency.value = 1500 + v * 2500; }
    o1.frequency.value = hz(midi); o2.frequency.value = hz(midi) * (kind === 'bass' ? 0.5 : 2.003); g2.gain.value = kind === 'bass' ? 0.5 : 0.25;
    f.type = 'lowpass'; f.Q.value = 0.8;
    const peak = (kind === 'bass' ? 0.3 : 0.22) * v;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    g.gain.exponentialRampToValueAtTime(peak * 0.5, when + Math.max(0.08, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.2);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(master);
    o1.start(when); o2.start(when); o1.stop(when + dur + 0.25); o2.stop(when + dur + 0.25);
  }
  const noise = (c, when, secs, hp, vol, curve) => { const n = c.createBufferSource(); const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, curve); n.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const gg = c.createGain(); gg.gain.value = vol; n.connect(f); f.connect(gg); gg.connect(master); n.start(when); };
  function drum(kind, when) {
    const c = audio();
    if (kind === 'h') { noise(c, when, 0.05, 6000, 0.22, 3); return; }
    const o = c.createOscillator(), gg = c.createGain(); o.connect(gg); gg.connect(master);
    if (kind === 'k') { o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.18); gg.gain.setValueAtTime(0.75, when); gg.gain.exponentialRampToValueAtTime(0.0001, when + 0.3); o.start(when); o.stop(when + 0.32); }
    else { o.type = 'triangle'; o.frequency.setValueAtTime(220, when); o.frequency.exponentialRampToValueAtTime(120, when + 0.1); gg.gain.setValueAtTime(0.35, when); gg.gain.exponentialRampToValueAtTime(0.0001, when + 0.18); o.start(when); o.stop(when + 0.2); noise(c, when, 0.12, 1500, 0.3, 2); }
  }
  // the hum: a voice that actually sings the phrase, in time, before the app writes it down.
  // One sine with a little second harmonic and breath, lowpassed like a closed mouth; slow vibrato,
  // a short glide into each note, a breath-shaped swell per note. Returns a stop() for the caller.
  function singPhrase(notes, at, stepSec, { octave = 0, level = 0.2 } = {}) {
    const c = audio();
    const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(), f = c.createBiquadFilter();
    const o3 = c.createOscillator(), g3 = c.createGain(); o3.type = 'triangle'; g3.gain.value = 0.22; o3.connect(g3); g3.connect(f);
    const vib = c.createOscillator(), vibG = c.createGain();
    o1.type = 'sine'; o2.type = 'sine'; f.type = 'lowpass'; f.frequency.value = 2400; f.Q.value = 0.8;
    g2.gain.value = 0.3; g.gain.value = 0.0001;
    vib.frequency.value = 5.2; vibG.gain.value = 0; vib.connect(vibG); vibG.connect(o1.detune); vibG.connect(o2.detune); vibG.connect(o3.detune);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(master);
    const breath = c.createBufferSource(); const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; breath.buffer = b; breath.loop = true;
    const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 0.6; const bg = c.createGain(); bg.gain.value = 0.012; breath.connect(bf); bf.connect(bg); bg.connect(g);
    const first = hz(notes[0][2] + octave); o1.frequency.setValueAtTime(first, at); o2.frequency.setValueAtTime(first * 2, at); o3.frequency.setValueAtTime(first, at);
    vibG.gain.setValueAtTime(0, at); vibG.gain.linearRampToValueAtTime(14, at + 0.6);
    let end = at;
    notes.forEach(([step, len, midi], i) => {
      const t = at + step * stepSec, dur = len * stepSec, p = hz(midi + octave);
      if (i > 0) { o1.frequency.setTargetAtTime(p, t - 0.03, 0.025); o2.frequency.setTargetAtTime(p * 2, t - 0.03, 0.025); o3.frequency.setTargetAtTime(p, t - 0.03, 0.025); }
      // every note swells in and settles, so the line phrases instead of droning
      g.gain.setTargetAtTime(level, t, 0.05);
      g.gain.setTargetAtTime(level * 0.72, t + dur * 0.55, 0.08);
      end = t + dur;
    });
    g.gain.setTargetAtTime(0.0001, end, 0.12);
    [o1, o2, o3, vib, breath].forEach((n) => { n.start(at); n.stop(end + 0.6); });
    return (now = c.currentTime) => { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0.0001, now, 0.08); [o1, o2, o3, vib, breath].forEach((n) => { try { n.stop(now + 0.3); } catch {} }); };
  }
  let humStopFn = null;
  function humStart() { const c = audio(); humStopFn = singPhrase(LEAD, c.currentTime + 0.02, STEP, { octave: 0, level: 0.42 }); }
  function humStop() { if (!humStopFn) return; humStopFn(); humStopFn = null; }
  function playBar(withLead, withBeat, withBass, at) {
    if (withLead) LEAD.forEach(([s, l, m]) => voice(m, at + s * STEP, l * STEP * 0.9, 0.8));
    if (withBeat) BEAT.forEach(([s, k]) => drum(k, at + s * STEP));
    if (withBass) BASS.forEach(([s, l, m]) => voice(m, at + s * STEP, l * STEP * 0.85, 0.9, 'bass'));
  }

  /* ---------------- the timeline ---------------- */
  let sound = false; let tl = null; let loop = null;
  const barSec = STEPS * STEP;
  const capAt = (tl, i, at) => { if (i > 0) tl.to(caps[i - 1], { autoAlpha: 0, y: -14, duration: 0.35, ease: 'power2.in' }, at); tl.fromTo(caps[i], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, at + 0.15); };
  function build() {
    if (tl) tl.kill(); if (loop) loop.kill(); humStop();
    gsap.set(caps, { autoAlpha: 0 }); gsap.set([...leadEls, ...beatEls, ...bassEls], { autoAlpha: 0, scaleX: 0.3, transformOrigin: 'left center', y: 0, backgroundColor: '' });
    gsap.set('.story-grid', { autoAlpha: 0 }); gsap.set('.lane-name', { autoAlpha: 0 }); gsap.set(head, { autoAlpha: 0, x: 0 });
    gsap.set(agentA, { autoAlpha: 0, xPercent: -200, yPercent: 0, rotate: -20 }); gsap.set(agentB, { autoAlpha: 0, xPercent: 200, rotate: 20 });
    gsap.set(W, { amp: 0, alpha: 0 });
    tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    // 1. a hum comes in
    tl.add(() => { if (sound) humStart(); }, 0.2);
    tl.to(W, { alpha: 1, amp: 28, duration: 1.6, ease: 'power2.out' }, 0.2);
    capAt(tl, 0, 0.3);
    tl.to(W, { amp: 44, duration: 1.2, ease: 'sine.inOut' }, 1.8);
    // 2. it becomes notes
    tl.to('.story-grid', { autoAlpha: 1, duration: 0.8 }, 2.6);
    tl.to('.lane-lead .lane-name', { autoAlpha: 1, duration: 0.5 }, 2.8);
    tl.add(() => { if (sound) humStop(); }, 2.9);
    tl.to(W, { alpha: 0, amp: 0, duration: 0.8, ease: 'power2.in' }, 2.9);
    capAt(tl, 1, 2.9);
    leadEls.forEach((el, i) => { tl.fromTo(el, { autoAlpha: 0, scaleX: 0.3, y: -30 }, { autoAlpha: 1, scaleX: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)', onStart: () => { if (sound) voice(LEAD[i][2], audio().currentTime, LEAD[i][1] * STEP * 0.9, 0.8); } }, 3.0 + LEAD[i][0] * STEP); });
    // 3. an agent lays a beat
    tl.to(agentA, { autoAlpha: 1, xPercent: 0, rotate: 0, duration: 0.9, ease: 'back.out(1.2)' }, 6.0);
    tl.to('.lane-beat .lane-name', { autoAlpha: 1, duration: 0.5 }, 6.4);
    capAt(tl, 2, 6.2);
    tl.to(agentA, { x: () => laneLead.clientWidth * 0.8, duration: 2.6, ease: 'none' }, 6.7);
    tl.to(agentA, { y: -8, duration: 0.18, yoyo: true, repeat: 13, ease: 'sine.inOut' }, 6.7);
    tl.to(agentA.querySelector('.arm-r'), { rotate: -70, duration: 0.16, yoyo: true, repeat: 15, ease: 'power1.inOut' }, 6.7);
    tl.to(agentA.querySelector('.arm-l'), { rotate: 70, duration: 0.16, yoyo: true, repeat: 15, ease: 'power1.inOut' }, 6.78);
    beatEls.forEach((el, i) => { tl.fromTo(el, { autoAlpha: 0, scaleX: 0.3, y: -24 }, { autoAlpha: 1, scaleX: 1, y: 0, duration: 0.4, ease: 'back.out(2)', onStart: () => { if (sound) drum(BEAT[i][1], audio().currentTime); } }, 6.7 + (BEAT[i][0] / STEPS) * 2.6); });
    tl.to(agentA, { xPercent: 0, x: () => laneLead.clientWidth * 0.8, y: -6, rotate: 8, duration: 0.5 }, 9.4);
    // 4. another reshapes the chords and adds a bass
    tl.to(agentB, { autoAlpha: 1, xPercent: 0, rotate: 0, duration: 0.9, ease: 'back.out(1.2)' }, 9.6);
    capAt(tl, 3, 9.8);
    RESHAPE.forEach(([idx, m], k) => { const el = leadEls[idx]; const rows = LEAD_RANGE[1] - LEAD_RANGE[0] + 1; const dy = () => -((m - LEAD[idx][2]) / rows) * laneLead.clientHeight; tl.to(el, { y: dy, backgroundColor: '#5b9cff', duration: 0.6, ease: 'back.out(1.5)', onStart: () => { if (sound) voice(m, audio().currentTime, 0.25, 0.7); } }, 10.4 + k * 0.35); });
    tl.to('.lane-bass .lane-name', { autoAlpha: 1, duration: 0.5 }, 11.0);
    tl.to(agentB, { x: () => -story.clientWidth * 0.5, duration: 2.0, ease: 'none' }, 11.2);
    tl.to(agentB, { y: -8, duration: 0.2, yoyo: true, repeat: 9, ease: 'sine.inOut' }, 11.2);
    tl.to(agentB.querySelector('.arm-l'), { rotate: 90, duration: 0.5, ease: 'back.out(2)' }, 10.4);
    tl.to(agentB.querySelector('.arm-l'), { rotate: 0, duration: 0.5 }, 11.3);
    tl.to(agentB.querySelector('.arm-r'), { rotate: -50, duration: 0.2, yoyo: true, repeat: 9, ease: 'power1.inOut' }, 11.2);
    bassEls.forEach((el, i) => { tl.fromTo(el, { autoAlpha: 0, scaleX: 0.3 }, { autoAlpha: 1, scaleX: 1, duration: 0.5, ease: 'back.out(1.6)', onStart: () => { if (sound) voice(BASS[i][2], audio().currentTime, 0.25, 0.7, 'bass'); } }, 11.3 + (1 - BASS[i][0] / STEPS) * 1.9); });
    // 5. now it is a song: the playhead sweeps, everything lights, the agents nod
    capAt(tl, 4, 13.6);
    tl.to(head, { autoAlpha: 1, duration: 0.3 }, 13.8);
    tl.add('song', 13.9);
    tl.add(() => startLoop(), 'song');
    return tl;
  }
  function startLoop() {
    if (loop) loop.kill();
    const run = () => {
      const at = audio().currentTime + 0.05;
      if (sound) playBar(true, true, true, at);
      loop = gsap.timeline({ onComplete: run });
      loop.fromTo(head, { x: 0 }, { x: () => laneLead.clientWidth, duration: barSec, ease: 'none' }, 0);
      [...leadEls, ...beatEls, ...bassEls].forEach((el, i) => { const list = i < leadEls.length ? LEAD : i < leadEls.length + beatEls.length ? BEAT : BASS; const item = list[i < leadEls.length ? i : i < leadEls.length + beatEls.length ? i - leadEls.length : i - leadEls.length - beatEls.length]; const t = (item[0] / STEPS) * barSec; loop.to(el, { scale: 1.12, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.out' }, t); });
      loop.to([agentA, agentB], { y: -10, duration: barSec / 8, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 0);
      loop.to(agentA.querySelector('.arm-r'), { rotate: -60, duration: barSec / 16, yoyo: true, repeat: 15, ease: 'power1.inOut' }, 0);
      loop.to(agentB.querySelector('.arm-r'), { rotate: -40, duration: barSec / 8, yoyo: true, repeat: 7, ease: 'power1.inOut' }, 0);
    };
    run();
  }
  const kickoff = () => { if (reduced()) { gsap.set([...leadEls, ...beatEls, ...bassEls, '.story-grid', '.lane-name', agentA, agentB, caps[4]], { autoAlpha: 1, scaleX: 1, xPercent: 0, rotate: 0 }); return; } build(); };
  if (document.fonts) document.fonts.ready.then(kickoff); else kickoff();
  btnHear.addEventListener('click', () => { audio(); sound = true; btnHear.classList.add('is-on'); btnHear.lastChild.textContent = 'Sound on'; build(); });
  btnAgain.addEventListener('click', () => { audio(); build(); });
  // pause the song when the hero is off screen
  new IntersectionObserver((e) => { if (!e[0].isIntersecting) { if (loop) loop.pause(); if (sound) { sound = false; btnHear.classList.remove('is-on'); btnHear.lastChild.textContent = 'Hear it'; } } else if (loop) loop.resume(); }).observe(story);

  // the three words live in how.js and borrow the story's instruments
  window.Accolai = { audio, hz, singPhrase, LEAD, STEP, barSec, drum, master: () => master };

  if (window.Stage) { Stage.smooth(); Stage.init(); }

})();
