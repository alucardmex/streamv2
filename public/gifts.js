// StreamV2 — dibujo de respaldo para cada regalo cuando no hay imagen (pruebas, o si la de TikTok no carga).
// TikTok puede mandar el nombre en inglés o en español, así que se buscan los dos.
window.giftEmoji = (() => {
  const LIST = [
    [['rosa', 'rose'], '🌹'], [['finger heart', 'corazon con dedos', 'corazon de dedos'], '🫰'], [['heart me', 'corazon', 'heart'], '❤️'],
    [['tiktok'], '🎵'], [['dona', 'doughnut', 'donut'], '🍩'], [['perfume'], '🧴'], [['leon', 'lion'], '🦁'],
    [['universo', 'universe'], '🌌'], [['galaxia', 'galaxy'], '🌌'], [['gg'], '🎮'], [['helado', 'ice cream'], '🍦'],
    [['sombrero', 'hat'], '🎩'], [['lentes', 'gafas', 'sunglasses'], '🕶️'], [['corgi'], '🐕'], [['gorra', 'cap'], '🧢'],
    [['money gun', 'pistola de dinero', 'dinero', 'money'], '💸'], [['cohete', 'rocket'], '🚀'], [['ballena', 'whale'], '🐳'],
    [['corona', 'crown'], '👑'], [['auto deportivo', 'sports car', 'carro', 'car'], '🏎️'], [['fuegos artificiales', 'fireworks'], '🎆'],
    [['avion', 'airplane', 'jet', 'plane'], '✈️'], [['castillo', 'castle'], '🏰'], [['diamante', 'diamond'], '💎'],
    [['moto', 'motorcycle'], '🏍️'], [['unicornio', 'unicorn'], '🦄'], [['panda'], '🐼'], [['tren', 'train'], '🚂'],
    [['yate', 'yacht'], '🛥️'], [['planeta', 'planet'], '🪐'], [['fenix', 'phoenix'], '🔥'], [['dragon'], '🐉'],
    [['mundo', 'world', 'globe'], '🌍'], [['cafe', 'coffee'], '☕'], [['pizza'], '🍕'], [['cerveza', 'beer'], '🍺'],
    [['globo', 'balloon'], '🎈'], [['pastel', 'cake'], '🎂'], [['osito', 'teddy', 'bear'], '🧸'], [['gato', 'cat'], '🐱'],
    [['perro', 'dog', 'puppy'], '🐶'], [['beso', 'kiss'], '💋'], [['flor', 'flower', 'tulip', 'tulipan'], '🌸'],
    [['estrella', 'star'], '⭐'], [['arcoiris', 'rainbow'], '🌈'], [['sol ', 'sun'], '☀️'], [['luna', 'moon'], '🌙'],
    [['trofeo', 'trophy'], '🏆'], [['medalla', 'medal'], '🏅'], [['microfono', 'mic'], '🎤'], [['guitarra', 'guitar'], '🎸'],
    [['hamburguesa', 'burger'], '🍔'], [['taco'], '🌮'], [['paleta', 'lollipop'], '🍭'], [['chocolate'], '🍫'],
    [['mariposa', 'butterfly'], '🦋'], [['pez', 'fish'], '🐟'], [['tigre', 'tiger'], '🐯'], [['aguila', 'eagle'], '🦅'],
  ];
  const norm = (t) => ` ${String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()} `;
  const emoji = (name) => {
    const n = norm(name);
    for (const [keys, e] of LIST) {
      if (keys.some((k) => (k.length <= 3 ? n.includes(` ${k.trim()} `) : n.includes(k)))) return e;
    }
    return '🎁';
  };
  // ¿Es el mismo regalo con nombre en otro idioma? ("Rosa" = "Rose", "León" = "Lion", "Dona" = "Doughnut")
  const group = (name) => {
    const n = norm(name).trim();
    return LIST.findIndex(([keys]) => keys.some((k) => k.trim() === n));
  };
  emoji.same = (a, b) => {
    if (norm(a) === norm(b)) return true;
    const ga = group(a);
    return ga >= 0 && ga === group(b);
  };
  return emoji;
})();
