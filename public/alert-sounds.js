// StreamV2 — sonidos de las alertas.
// Los sonidos incluidos se generan aquí mismo (no usan archivos). También se pueden usar sonidos propios subidos
// desde el panel (MP3, WAV u OGG): se guardan en la carpeta de datos y se piden como /media/<archivo>.
// Lo usan el overlay de alertas y el panel (botón ▶ para escucharlos).
window.AlertSounds = (() => {
  const PRESETS = [
    ['campana', 'Campana'], ['moneda', 'Moneda'], ['fanfarria', 'Fanfarria'], ['arcade', 'Arcade'], ['laser', 'Láser'],
    ['tambores', 'Tambores'], ['explosion', 'Explosión'], ['magia', 'Magia'], ['latido', 'Latido'], ['burbuja', 'Burbuja'], ['ninguno', 'Sin sonido'],
  ];
  let ctx, noise;
  const audio = () => {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  // Salida de cada sonido: su volumen y un limitador para que nunca truene.
  function out(c, vol) {
    const g = c.createGain();
    g.gain.value = vol;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -10; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.2;
    g.connect(lim).connect(c.destination);
    return g;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(c, dst, { type = 'sine', f, f2, t, a = 0.008, d = 0.3, vol = 0.3, detune = 0 }) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, vol, d);
    o.connect(g).connect(dst);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }
  function hiss(c, dst, { t, d = 0.2, vol = 0.3, type = 'bandpass', f = 1200, f2, q = 1, a = 0.004 }) {
    if (!noise) {
      noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const ch = noise.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    const g = c.createGain();
    env(g, t, a, vol, d);
    src.connect(fl).connect(g).connect(dst);
    src.start(t);
    src.stop(t + a + d + 0.05);
  }
  const boom = (c, dst, t, k = 1) => {
    tone(c, dst, { f: 150, f2: 34, t, a: 0.01, d: 0.7, vol: 0.75 * k });
    hiss(c, dst, { t, d: 0.5, vol: 0.35 * k, type: 'lowpass', f: 1400, f2: 90 });
  };

  // tier: 0 regalo chico · 1 épico · 2 legendario · 3 mítico. kind: 'gift' o el tipo de alerta.
  const SYN = {
    campana(c, dst, t, tier, kind) {
      const notes = kind === 'follow' || kind === 'share' || kind === 'join' ? [659, 880]
        : tier >= 2 ? [523, 659, 784, 1047, 1319] : tier === 1 ? [587, 740, 880, 1175] : [784, 1047];
      notes.forEach((f, i) => tone(c, dst, { type: i % 2 ? 'triangle' : 'sine', f, t: t + i * 0.09, a: 0.02, d: 0.6, vol: 0.3 }));
      if (tier >= 2) boom(c, dst, t + 0.3, tier === 3 ? 1 : 0.7);
    },
    moneda(c, dst, t, tier) {
      const n = 1 + tier * 2;
      for (let i = 0; i < n; i++) {
        const k = t + i * 0.11, up = 1 + i * 0.06;
        tone(c, dst, { type: 'square', f: 988 * up, t: k, a: 0.004, d: 0.07, vol: 0.3 });
        tone(c, dst, { type: 'square', f: 1319 * up, t: k + 0.075, a: 0.004, d: 0.38, vol: 0.3 });
      }
    },
    fanfarria(c, dst, t, tier) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(dst);
      const seq = [[392, 0, 0.12], [523, 0.13, 0.12], [659, 0.26, 0.12], [784, 0.39, 0.7]];
      seq.forEach(([f, dt, d]) => [-8, 8].forEach((det) => tone(c, lp, { type: 'sawtooth', f, t: t + dt, a: 0.02, d, vol: 0.12, detune: det })));
      [523, 659, 784].forEach((f) => tone(c, lp, { type: 'sawtooth', f, t: t + 0.39, a: 0.03, d: 0.9, vol: 0.07 }));
      if (tier >= 2) boom(c, dst, t + 0.39, tier === 3 ? 0.9 : 0.6);
    },
    arcade(c, dst, t, tier) {
      const base = [523, 659, 784, 1047, 1319, 1568, 2093];
      const notes = tier >= 2 ? [...base, 1568, 2093, 2637] : base;
      notes.forEach((f, i) => tone(c, dst, { type: 'square', f, t: t + i * 0.05, a: 0.003, d: 0.12, vol: 0.24 }));
    },
    laser(c, dst, t, tier) {
      for (let i = 0; i <= Math.min(2, tier); i++) {
        tone(c, dst, { type: 'sawtooth', f: 1900, f2: 180, t: t + i * 0.16, a: 0.005, d: 0.3, vol: 0.34 });
        tone(c, dst, { type: 'sine', f: 2400, f2: 260, t: t + i * 0.16, a: 0.005, d: 0.3, vol: 0.24 });
      }
    },
    tambores(c, dst, t, tier) {
      const hits = 10 + tier * 4;
      let k = t;
      for (let i = 0; i < hits; i++) {
        hiss(c, dst, { t: k, d: 0.06, vol: 0.18 + (i / hits) * 0.22, f: 1800, q: 0.8 });
        k += Math.max(0.035, 0.09 - i * 0.005);
      }
      tone(c, dst, { f: 120, f2: 40, t: k, a: 0.005, d: 0.4, vol: 0.7 });
      hiss(c, dst, { t: k, d: 1.2, vol: 0.32, type: 'highpass', f: 3000 });
    },
    explosion(c, dst, t, tier) {
      boom(c, dst, t, 1);
      hiss(c, dst, { t, d: 1.1 + tier * 0.2, vol: 0.5, type: 'lowpass', f: 3200, f2: 70 });
      tone(c, dst, { f: 60, f2: 28, t: t + 0.05, a: 0.02, d: 1.2, vol: 0.5 });
    },
    magia(c, dst, t, tier) {
      const scale = [1568, 1760, 2093, 2349, 2637, 3136, 3520];
      const n = 10 + tier * 4;
      for (let i = 0; i < n; i++) {
        const f = scale[Math.floor(Math.random() * scale.length)];
        tone(c, dst, { type: 'sine', f, t: t + i * 0.055 + Math.random() * 0.02, a: 0.003, d: 0.5, vol: 0.16 });
      }
      tone(c, dst, { type: 'triangle', f: 700, f2: 2100, t, a: 0.05, d: 0.6, vol: 0.08 });
    },
    latido(c, dst, t, tier) {
      const beats = tier >= 2 ? 3 : 2;
      for (let i = 0; i < beats; i++) {
        const k = t + i * 0.62;
        tone(c, dst, { f: 70, f2: 45, t: k, a: 0.01, d: 0.16, vol: 0.85 });
        tone(c, dst, { f: 62, f2: 40, t: k + 0.2, a: 0.01, d: 0.2, vol: 0.7 });
      }
      tone(c, dst, { type: 'triangle', f: 880, t: t + 0.05, a: 0.2, d: 1, vol: 0.05 });
    },
    burbuja(c, dst, t) {
      tone(c, dst, { f: 420, f2: 980, t, a: 0.005, d: 0.11, vol: 0.55 });
      tone(c, dst, { f: 560, f2: 1300, t: t + 0.13, a: 0.005, d: 0.12, vol: 0.5 });
    },
  };

  // id: un sonido incluido o 'file:<archivo>'. vol: 0 a 1.5 (ya multiplicado por el volumen general).
  function play(id, { vol = 0.6, tier = 0, kind = 'gift' } = {}) {
    if (!id || id === 'ninguno' || vol <= 0) return null;
    try {
      const c = audio();
      if (id.startsWith('file:')) {
        const el = new Audio(`/media/${encodeURIComponent(id.slice(5))}`);
        // Por WebAudio para poder subirle por encima del 100%.
        const g = c.createGain();
        g.gain.value = vol;
        c.createMediaElementSource(el).connect(g).connect(c.destination);
        el.play().catch(() => {});
        return el;
      }
      (SYN[id] || SYN.campana)(c, out(c, vol), c.currentTime + 0.02, tier, kind);
    } catch {}
    return null;
  }
  return { PRESETS, play };
})();
