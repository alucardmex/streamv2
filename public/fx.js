// StreamV2 — animaciones de overlays (compartido por top-regalo.html y ranking.html).
// Uso: FX.apply(ajustes)  ·  FX.decorate(tarjeta)  ·  FX.change(elemento)
//      FX.snapshot(cont) + FX.flip(cont, foto, escala)  ·  FX.count(el, clave, valor, formato)  ·  FX.sync(cont)
window.FX = (() => {
  let cfg = { on: false };
  let starTimer = null;
  const tweens = new Map();

  const on = () => !!cfg.on;
  const speed = () => ({ suave: 1.35, fuerte: 0.7 }[cfg.intensity] || 1);
  const amp = () => ({ suave: 0.55, fuerte: 1.7 }[cfg.intensity] || 1);

  function apply(c) {
    cfg = { ...(c || {}) };
    const b = document.body;
    [...b.classList].filter((k) => k.startsWith('fx-')).forEach((k) => b.classList.remove(k));
    if (on()) b.classList.add('fx-on', `fx-idle-${cfg.idle || 'ninguno'}`, `fx-${cfg.intensity || 'normal'}`);
    clearInterval(starTimer);
    if (on() && cfg.idle === 'destellos') starTimer = setInterval(sparkle, 420 * speed());
  }

  // Agrega las capas de brillo y borde de luz a la tarjeta principal.
  function decorate(el) {
    if (!el || el.querySelector(':scope > .fx-shine')) return;
    el.classList.add('fx-target');
    el.insertAdjacentHTML('afterbegin', '<span class="fx-border" aria-hidden="true"></span><span class="fx-shine" aria-hidden="true"></span>');
  }

  // Efecto "al cambiar" sobre un elemento. La clave sirve para que, si el elemento se
  // vuelve a dibujar a medio efecto, el efecto siga donde iba en lugar de reiniciarse.
  const started = new Map();
  const CHANGE_MS = 800;
  function change(el, key) {
    if (!el || !on()) return;
    const cls = `fx-c-${cfg.change || 'pop'}`;
    const now = performance.now();
    const t0 = key != null ? started.get(key) : undefined;
    const end = (e) => {
      if (e.target !== el) return;
      el.classList.remove(cls);
      el.style.animationDelay = '';
      el.removeEventListener('animationend', end);
      requestAnimationFrame(() => sync(el)); // la ola de esta fila vuelve al mismo ritmo que las demás
    };
    if (t0 != null && now - t0 < CHANGE_MS) {
      if (el.classList.contains(cls)) return; // ya va a medio efecto
      el.style.animationDelay = `-${Math.round(now - t0)}ms`;
    } else {
      if (key != null) started.set(key, now);
      el.classList.remove(cls);
      el.style.animationDelay = '';
      void el.offsetWidth;
    }
    el.classList.add(cls);
    el.addEventListener('animationend', end);
  }

  // Las animaciones que se repiten siguen un mismo reloj: aunque el overlay se redibuje
  // (llegan taps cada medio segundo) el brillo, el borde o la ola no vuelven a empezar.
  function sync(container) {
    if (!container?.getAnimations) return;
    for (const a of container.getAnimations({ subtree: true })) {
      try {
        if (a.effect?.getTiming().iterations === Infinity && a.startTime !== 0) a.startTime = 0;
      } catch {}
    }
  }

  // Marca a quien subió de puesto.
  function rankUp(el) {
    if (!el || !on() || cfg.rankUp === false) return;
    el.classList.add('fx-up');
    const a = document.createElement('span');
    a.className = 'fx-arrow';
    a.textContent = '▲';
    el.appendChild(a);
    setTimeout(() => { el.classList.remove('fx-up'); a.remove(); }, 2700);
  }

  // Reacomodo suave: guarda posiciones antes de redibujar y anima hacia las nuevas.
  function snapshot(container) {
    const m = new Map();
    container.querySelectorAll('[data-id]').forEach((el) => m.set(el.dataset.id, el.getBoundingClientRect()));
    return m;
  }
  function flip(container, before, scale = 1) {
    if (!on()) return;
    container.querySelectorAll('[data-id]').forEach((el) => {
      const r = before.get(el.dataset.id);
      if (!r) return;
      const n = el.getBoundingClientRect();
      const dx = (r.left - n.left) / scale;
      const dy = (r.top - n.top) / scale;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = `transform ${0.65 * speed()}s cubic-bezier(.2,.9,.3,1.15)`;
        el.style.transform = '';
      }));
    });
  }

  // Números que suben en lugar de saltar.
  // start: desde dónde contar si es la primera vez que se ve esta clave (por defecto 0).
  function count(el, key, to, format, start = 0) {
    if (!el) return;
    const enabled = on() && cfg.counters !== false;
    const prev = tweens.get(key);
    const from = prev ? prev.val : enabled ? start : to;
    const state = { val: from };
    tweens.set(key, state);
    if (!enabled || from === to) { state.val = to; el.textContent = format(to); return; }
    const dur = Math.min(1600, 700 + Math.log10(Math.abs(to - from) + 1) * 180) * speed();
    const t0 = performance.now();
    el.textContent = format(from);
    const step = (t) => {
      if (tweens.get(key) !== state) return;
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      state.val = Math.round(from + (to - from) * e);
      if (el.isConnected) el.textContent = format(state.val);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function sparkle() {
    const targets = [...document.querySelectorAll('.fx-target')];
    if (!targets.length || document.hidden) return;
    const n = Math.max(1, Math.round(amp() * 1.5));
    for (let i = 0; i < n; i++) {
      const r = targets[Math.floor(Math.random() * targets.length)].getBoundingClientRect();
      if (!r.width) continue;
      // Sobre el contorno de la tarjeta, un poco hacia afuera.
      const side = Math.random();
      let x, y;
      if (side < 0.5) { x = r.left + Math.random() * r.width; y = side < 0.25 ? r.top - 6 : r.bottom - 6; }
      else { y = r.top + Math.random() * r.height; x = side < 0.75 ? r.left - 8 : r.right - 8; }
      const s = document.createElement('span');
      s.className = 'fx-star';
      s.textContent = Math.random() < 0.6 ? '✦' : '✧';
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1400 * speed() + 100);
    }
  }

  return { apply, decorate, change, rankUp, snapshot, flip, count, reset: (key) => tweens.delete(key), sync, get on() { return on(); } };
})();
