// StreamV2 — qué overlays caben en una Escena (un solo link con varios overlays juntos).
// Lo usan escena.html (lo que ve OBS / TikTok LIVE Studio) y el editor del panel.
window.SCENE_TYPES = {
  alertas: { name: 'Alertas', icon: '🎁', path: '/alertas.html', w: 900, h: 520 },
  topGift: { name: 'Regalo más caro', icon: '💎', path: '/top-regalo.html', w: 540, h: 280 },
  likes: { name: 'Top taps', icon: '❤️', path: '/ranking.html', w: 420, h: 560 },
  gifts: { name: 'Top regalos', icon: '🏆', path: '/ranking.html?tipo=regalos', w: 420, h: 560 },
  chat: { name: 'Chat', icon: '💬', path: '/chat.html', w: 460, h: 520 },
  timer: { name: 'Contador de tiempo', icon: '⏱️', path: '/contador.html', w: 460, h: 260 },
  matches: { name: 'Partidas PUBG', icon: '🍗', path: '/partidas.html', w: 720, h: 170 },
  rank: { name: 'Camino a Conquistador', icon: '🏅', path: '/rango.html', w: 620, h: 330 },
};

// Link de cada overlay dentro de la escena. preview=true es para el editor del panel:
// muestra datos de ejemplo y las alertas reales no suenan ahí.
window.sceneSrc = (item, preview = false) => {
  const t = window.SCENE_TYPES[item.type];
  if (!t) return 'about:blank';
  const u = new URL(t.path, location.origin);
  if (item.scale && item.scale !== 1) u.searchParams.set('escala', String(item.scale));
  if (item.type === 'alertas' && item.pos && item.pos !== 'centro') u.searchParams.set('posicion', item.pos);
  if (preview) {
    if (item.type === 'alertas') { u.searchParams.set('vista', '1'); u.searchParams.set('sonido', '0'); }
    else if (item.type !== 'timer' && item.type !== 'rank') u.searchParams.set('demo', '1');
  }
  return u.pathname + u.search;
};
