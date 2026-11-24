// StreamV2 — foto de perfil de quien manda regalos o da taps (la usan las alertas, el regalo más caro y los tops).
// Si no hay foto, o no carga, se ve su inicial sobre un color que siempre es el mismo para esa persona.
(() => {
  const PALETTES = [['#fe2c55', '#7a3cff'], ['#25f4ee', '#3a5bff'], ['#ffb21e', '#ff2d55'], ['#b45cff', '#25f4ee'], ['#ff7a1a', '#ffcf33'], ['#0ec2a0', '#3a5bff']];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Letras "de verdad": un emoji compuesto o una letra con acento cuentan como una sola.
  const seg = window.Intl?.Segmenter ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
  window.graphemes = (s) => (seg ? [...seg.segment(String(s ?? ''))].map((x) => x.segment) : [...String(s ?? '')]);
  window.initialBg = (name) => {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    const [x, y] = PALETTES[h % PALETTES.length];
    return `linear-gradient(135deg, ${x}, ${y})`;
  };
  window.initialOf = (name) => (graphemes(String(name || '?').trim())[0] || '?').toUpperCase();
  // Fotos de ejemplo para las vistas previas del panel (en tu live sale la foto real de cada quien).
  const FACES = [['🦊', '#ff7a1a', '#ff2d55'], ['🐼', '#25f4ee', '#3a5bff'], ['😎', '#b45cff', '#fe2c55'], ['🐯', '#ffcf33', '#ff7a1a'], ['🐸', '#53fc18', '#0e9f6e'], ['🦄', '#ff8fd8', '#7a3cff']];
  window.demoFace = (i) => {
    const [e, x, y] = FACES[Math.abs(i) % FACES.length];
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="${x}"/><stop offset="1" stop-color="${y}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="84" font-size="68" text-anchor="middle">${e}</text></svg>`);
  };
  // La inicial va debajo y la foto encima: si la foto falla, se quita y queda la inicial.
  window.faceHtml = (u, iniCls = 'ini') => {
    const ini = `<span class="${iniCls}" style="background:${initialBg(u?.name)}">${esc(initialOf(u?.name))}</span>`;
    return u?.avatar ? `${ini}<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ini;
  };
})();
