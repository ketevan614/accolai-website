// Scene "hum": a sung line turns into notes on the piano roll, scrubbed by the scroll.
// Markup: <section class="scene" data-scene="hum"> with .hum-pic holding #hum-wave-path, #hum-notes, #hum-vel.
// The finished composition (rest): the notes on the grid, velocity drawn, the last caption shown.
(() => {
  // The phrase. x = start in 1/16ths of 16, len in 1/16ths, row = pitch row 0 (top) to 13 (bottom).
  const PHRASE = [
    { x: 0, len: 2, row: 8 }, { x: 2, len: 1, row: 6 }, { x: 3, len: 1, row: 5 }, { x: 4, len: 3, row: 3 },
    { x: 7, len: 1, row: 5 }, { x: 8, len: 2, row: 6 }, { x: 10, len: 2, row: 8 }, { x: 12, len: 4, row: 10 },
  ];
  const VEL = [0.7, 0.5, 0.6, 0.95, 0.5, 0.6, 0.7, 0.85];
  const ROWS = 14, COLS = 16;

  // The wobbly sung line through the same pitches, as an SVG path in the picture's 1000x420 box.
  function wavePath(w, h) {
    const pts = [];
    const rowH = h / ROWS, colW = w / COLS;
    for (let i = 0; i <= 160; i++) {
      const t = i / 160; // 0..1 across the bar
      const x16 = t * COLS;
      // which note is sounding
      let note = PHRASE[0];
      for (const n of PHRASE) if (x16 >= n.x) note = n;
      const base = (note.row + 0.5) * rowH;
      const wob = Math.sin(t * 60) * rowH * 0.28 + Math.sin(t * 17 + 1) * rowH * 0.2;
      const slide = Math.sin(t * 6.1) * rowH * 0.15;
      pts.push([t * w, base + wob + slide]);
    }
    return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  }

  function layout(root) {
    const notes = root.querySelector('#hum-notes');
    const vel = root.querySelector('#hum-vel');
    const path = root.querySelector('#hum-wave-path');
    if (!notes || notes.childElementCount) return;
    path.setAttribute('d', wavePath(1000, 420));
    PHRASE.forEach((n, i) => {
      const el = document.createElement('i');
      el.className = 'hum-note';
      el.dataset.move = '';
      el.style.setProperty('--gx', (n.x / COLS * 100) + '%');
      el.style.setProperty('--gy', (n.row / ROWS * 100) + '%');
      el.style.left = (n.x / COLS * 100) + '%';
      el.style.top = (n.row / ROWS * 100) + '%';
      el.style.width = (n.len / COLS * 100) + '%';
      notes.appendChild(el);
      const v = document.createElement('i');
      v.dataset.move = '';
      v.style.left = (n.x / COLS * 100 + 0.4) + '%';
      v.style.height = (VEL[i] * 30) + '%';
      vel.appendChild(v);
    });
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.hum = (root, o = {}) => {
    layout(root);
    return Stage.scene(root, {
      hold: o.hold ?? 3,
      scrub: 0.4,
      beats: 4,
      phone: 'same',
      build(tl, ctx) {
        const notes = ctx.q('.hum-note');
        const vels = ctx.q('.hum-vel i');
        const caps = ctx.q('.hum-cap');
        const wave = ctx.root.querySelector('.hum-wave');
        const cursor = ctx.root.querySelector('.hum-cursor');
        const pic = ctx.root.querySelector('.hum-pic');
        const picW = () => pic.clientWidth;

        // 0 → 0.25: the cursor crosses, the line is drawn (stroke dash), notes do not exist yet
        const len = ctx.root.querySelector('#hum-wave-path').getTotalLength();
        gsap.set('#hum-wave-path', { strokeDasharray: len, strokeDashoffset: len });
        gsap.set(notes, { opacity: 0, scaleX: 0.1, transformOrigin: 'left center' });
        gsap.set(vels, { scaleY: 0 });
        gsap.set(caps, { autoAlpha: 0, y: 24 });
        gsap.set(caps[0], { autoAlpha: 1, y: 0 });

        tl.to('#hum-wave-path', { strokeDashoffset: 0, duration: 0.3 }, 0);
        tl.to(cursor, { x: () => picW(), duration: 0.3 }, 0);
        // captions follow the beats
        const cap = (i, at) => {
          tl.to(caps[i - 1], { autoAlpha: 0, y: -24, duration: 0.05 }, at);
          tl.to(caps[i], { autoAlpha: 1, y: 0, duration: 0.07 }, at + 0.02);
        };
        cap(1, 0.14);
        // 0.3 → 0.6: each note appears where the line is, stretching to length, staggered
        notes.forEach((n, i) => {
          tl.to(n, { opacity: 1, scaleX: 1, duration: 0.08, ease: 'power2.out' }, 0.32 + i * 0.035);
        });
        tl.to(wave, { opacity: 0.18, duration: 0.15 }, 0.45);
        tl.to(cursor, { opacity: 0, duration: 0.05 }, 0.5);
        cap(2, 0.42);
        // 0.65 → 0.85: velocity rises, one note gets picked and moves a row (the edit)
        vels.forEach((v, i) => tl.to(v, { scaleY: 1, duration: 0.05 }, 0.62 + i * 0.015));
        cap(3, 0.72);
        tl.to(notes[3], { scaleY: 1.6, duration: 0.03 }, 0.76);
        tl.to(notes[3], { y: () => -pic.clientHeight / ROWS, duration: 0.08, ease: 'power2.inOut' }, 0.8);
        tl.to(notes[3], { scaleX: 1.34, duration: 0.08, ease: 'power2.inOut' }, 0.88);
        tl.to({}, { duration: 0.04 }, 0.96);
      },
      rest(ctx) {
        // finished composition: the edited phrase at rest
        const n3 = ctx.root.querySelector('.hum-note:nth-child(4)');
        if (n3) { n3.style.top = (2 / ROWS * 100) + '%'; n3.style.width = (4 / COLS * 100) + '%'; }
      },
    });
  };
})();
