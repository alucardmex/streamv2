// StreamV2 — tamaño, tipografía y color de los textos de los overlays
// (título, nombre del donador, nombre del regalo, cantidad). Lo usan los overlays y el panel.
window.TEXT_FONTS = [
  // [nombre que se ve, familia CSS, pesos de Google Fonts ('' = fuente de Windows, no se descarga)]
  ['Outfit', 'Outfit', 'wght@400;700;900'],
  ['Poppins', 'Poppins', 'wght@400;700;900'],
  ['Montserrat', 'Montserrat', 'wght@400;700;900'],
  ['Bebas Neue', 'Bebas Neue', null],
  ['Anton', 'Anton', null],
  ['Bungee', 'Bungee', null],
  ['Russo One', 'Russo One', null],
  ['Black Ops One', 'Black Ops One', null],
  ['Teko', 'Teko', 'wght@500;700'],
  ['Orbitron', 'Orbitron', 'wght@500;900'],
  ['Audiowide', 'Audiowide', null],
  ['Press Start 2P', 'Press Start 2P', null],
  ['Bangers', 'Bangers', null],
  ['Righteous', 'Righteous', null],
  ['Fredoka', 'Fredoka', 'wght@400;700'],
  ['Permanent Marker', 'Permanent Marker', null],
  ['Pacifico', 'Pacifico', null],
  ['Lobster', 'Lobster', null],
  ['Creepster', 'Creepster', null],
  ['Rubik Mono One', 'Rubik Mono One', null],
  ['Arial', 'Arial', ''],
  ['Impact', 'Impact', ''],
  ['Comic Sans', 'Comic Sans MS', ''],
  ['Georgia', 'Georgia', ''],
];

(() => {
  const loaded = new Set();
  window.loadTextFont = (family) => {
    const f = TEXT_FONTS.find((x) => x[1] === family);
    if (!f || f[2] === '' || loaded.has(family)) return;
    loaded.add(family);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}${f[2] ? ':' + f[2] : ''}&display=swap`;
    document.head.appendChild(l);
  };

  const PARTS = ['name', 'gift', 'value'];
  const css = PARTS.map((p) => `
    .tx-${p} { font-size: calc(1em * var(--tx-${p}-size, 1)); }
    body.tx-${p}-f .tx-${p}, body.tx-${p}-f .tx-${p} * { font-family: var(--tx-${p}-font), sans-serif !important; }
    body.tx-${p}-c .tx-${p}, body.tx-${p}-c .tx-${p} * { color: var(--tx-${p}-color) !important; -webkit-text-fill-color: var(--tx-${p}-color) !important; }`).join('');
  // Título del overlay: tamaño en px (no en porcentaje), color y tipografía. 0 / vacío = lo que trae el estilo.
  const titleCss = `
    body.tx-title-s .tx-title { font-size: var(--tx-title-px) !important; line-height: 1.1 !important; }
    body.tx-title-f .tx-title { font-family: var(--tx-title-font), sans-serif !important; }
    body.tx-title-c .tx-title { color: var(--tx-title-color) !important; -webkit-text-fill-color: var(--tx-title-color) !important; }`;
  const style = document.createElement('style');
  style.textContent = css + titleCss;
  document.head.appendChild(style);

  window.applyTitleStyle = (ts = {}) => {
    const b = document.body;
    const px = Math.max(0, Math.min(300, Number(ts?.px) || 0));
    b.style.setProperty('--tx-title-px', `${px}px`);
    b.classList.toggle('tx-title-s', px > 0);
    if (ts?.font) { b.style.setProperty('--tx-title-font', `'${String(ts.font).replace(/'/g, '')}'`); loadTextFont(ts.font); }
    b.classList.toggle('tx-title-f', !!ts?.font);
    const ok = /^#[0-9a-f]{3,8}$/i.test(ts?.color || '');
    if (ok) b.style.setProperty('--tx-title-color', ts.color);
    b.classList.toggle('tx-title-c', ok);
  };

  // text = { name: { font, size, color }, gift: {...}, value: {...} }; vacío = lo que trae el estilo.
  window.applyTextStyle = (text = {}) => {
    const b = document.body;
    for (const p of PARTS) {
      const t = text?.[p] || {};
      const size = Math.max(0.4, Math.min(3, Number(t.size) || 1));
      b.style.setProperty(`--tx-${p}-size`, String(size));
      if (t.font) { b.style.setProperty(`--tx-${p}-font`, `'${String(t.font).replace(/'/g, '')}'`); loadTextFont(t.font); }
      b.classList.toggle(`tx-${p}-f`, !!t.font);
      if (/^#[0-9a-f]{3,8}$/i.test(t.color || '')) b.style.setProperty(`--tx-${p}-color`, t.color);
      b.classList.toggle(`tx-${p}-c`, /^#[0-9a-f]{3,8}$/i.test(t.color || ''));
    }
  };
})();
