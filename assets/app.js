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
  let humOsc = null;
  function humStart() { const c = audio(); humOsc = c.createOscillator(); const g = c.createGain(); humOsc.type = 'sine'; g.gain.value = 0.0001; humOsc.connect(g); g.connect(master); humOsc.start(); g.gain.exponentialRampToValueAtTime(0.14, c.currentTime + 0.4); humOsc.__g = g; let i = 0; const seq = LEAD.map((n) => n[2]); const next = () => { if (!humOsc) return; humOsc.frequency.exponentialRampToValueAtTime(hz(seq[i % seq.length]) / 2, c.currentTime + 0.12); i++; humOsc.__t = setTimeout(next, 180); }; next(); }
  function humStop() { if (!humOsc) return; const c = audio(); clearTimeout(humOsc.__t); humOsc.__g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25); humOsc.stop(c.currentTime + 0.3); humOsc = null; }
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
    tl.add(() => { if (sound) humStop(); }, 3.0);
    tl.to(W, { alpha: 0, amp: 0, duration: 0.8, ease: 'power2.in' }, 2.9);
    capAt(tl, 1, 2.9);
    leadEls.forEach((el, i) => { tl.fromTo(el, { autoAlpha: 0, scaleX: 0.3, y: -30 }, { autoAlpha: 1, scaleX: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)', onStart: () => { if (sound) voice(LEAD[i][2], audio().currentTime, 0.18, 0.5); } }, 3.0 + i * 0.09); });
    // 3. an agent lays a beat
    tl.to(agentA, { autoAlpha: 1, xPercent: 0, rotate: 0, duration: 0.9, ease: 'back.out(1.2)' }, 4.6);
    tl.to('.lane-beat .lane-name', { autoAlpha: 1, duration: 0.5 }, 5.0);
    capAt(tl, 2, 4.8);
    tl.to(agentA, { x: () => laneLead.clientWidth * 0.8, duration: 2.6, ease: 'none' }, 5.3);
    tl.to(agentA, { y: -8, duration: 0.18, yoyo: true, repeat: 13, ease: 'sine.inOut' }, 5.3);
    beatEls.forEach((el, i) => { tl.fromTo(el, { autoAlpha: 0, scaleX: 0.3, y: -24 }, { autoAlpha: 1, scaleX: 1, y: 0, duration: 0.4, ease: 'back.out(2)', onStart: () => { if (sound) drum(BEAT[i][1], audio().currentTime); } }, 5.3 + (BEAT[i][0] / STEPS) * 2.6); });
    tl.to(agentA, { xPercent: 0, x: () => laneLead.clientWidth * 0.8, y: -6, rotate: 8, duration: 0.5 }, 8.0);
    // 4. another reshapes the chords and adds a bass
    tl.to(agentB, { autoAlpha: 1, xPercent: 0, rotate: 0, duration: 0.9, ease: 'back.out(1.2)' }, 8.2);
    capAt(tl, 3, 8.4);
    RESHAPE.forEach(([idx, m], k) => { const el = leadEls[idx]; const rows = LEAD_RANGE[1] - LEAD_RANGE[0] + 1; const dy = () => -((m - LEAD[idx][2]) / rows) * laneLead.clientHeight; tl.to(el, { y: dy, backgroundColor: '#5b9cff', duration: 0.6, ease: 'back.out(1.5)', onStart: () => { if (sound) voice(m, audio().currentTime, 0.25, 0.7); } }, 9.0 + k * 0.35); });
    tl.to('.lane-bass .lane-name', { autoAlpha: 1, duration: 0.5 }, 9.6);
    tl.to(agentB, { x: () => -story.clientWidth * 0.5, duration: 2.0, ease: 'none' }, 9.8);
    tl.to(agentB, { y: -8, duration: 0.2, yoyo: true, repeat: 9, ease: 'sine.inOut' }, 9.8);
    bassEls.forEach((el, i) => { tl.fromTo(el, { autoAlpha: 0, scaleX: 0.3 }, { autoAlpha: 1, scaleX: 1, duration: 0.5, ease: 'back.out(1.6)', onStart: () => { if (sound) voice(BASS[i][2], audio().currentTime, 0.25, 0.7, 'bass'); } }, 9.9 + (1 - BASS[i][0] / STEPS) * 1.9); });
    // 5. now it is a song: the playhead sweeps, everything lights, the agents nod
    capAt(tl, 4, 12.2);
    tl.to(head, { autoAlpha: 1, duration: 0.3 }, 12.4);
    tl.add('song', 12.5);
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
    };
    run();
  }
  const kickoff = () => { if (reduced()) { gsap.set([...leadEls, ...beatEls, ...bassEls, '.story-grid', '.lane-name', agentA, agentB, caps[4]], { autoAlpha: 1, scaleX: 1, xPercent: 0, rotate: 0 }); return; } build(); };
  if (document.fonts) document.fonts.ready.then(kickoff); else kickoff();
  btnHear.addEventListener('click', () => { audio(); sound = true; btnHear.classList.add('is-on'); btnHear.lastChild.textContent = 'Sound on'; build(); });
  btnAgain.addEventListener('click', () => { audio(); build(); });
  // pause the song when the hero is off screen
  new IntersectionObserver((e) => { if (!e[0].isIntersecting) { if (loop) loop.pause(); if (sound) { sound = false; btnHear.classList.remove('is-on'); btnHear.lastChild.textContent = 'Hear it'; } } else if (loop) loop.resume(); }).observe(story);

  /* ======================================================================
     THE THREE WORDS: each one is a toy
     ====================================================================== */
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


  if (window.Stage) { Stage.smooth(); Stage.init(); }

})();
