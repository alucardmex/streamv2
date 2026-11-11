// StreamV2 — servidor local
// Se conecta a tu TikTok LIVE y reparte los eventos (regalos, likes, chat)
// al panel de control y a los overlays por socket.io.
// Lo arranca la app de escritorio (electron/main.js); también funciona con `node server.js`.

import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
  UserOfflineError,
} from 'tiktok-live-connector';
import { synthesize, listVoices, VoiceError, FISH_MODELS } from './tts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3939;
const HOST = '127.0.0.1';
// En la app de escritorio los datos viven en la carpeta del usuario (%APPDATA%\\StreamV2),
// así sobreviven a las actualizaciones.
const DESKTOP = Boolean(process.env.STREAMV2_DESKTOP);
export const DATA_DIR = process.env.STREAMV2_DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const RANKING_FILE = path.join(DATA_DIR, 'ranking.json');

// ---------------------------------------------------------------------------
// Configuración (se guarda en config.json)
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  username: '',
  signApiKey: '',
  autoConnect: false,
  // API key de Fish Audio. Nunca se manda al navegador.
  voiceKeys: { fish: '' },
  settings: {
    voices: {
      // Tus voces de Fish Audio: { id, name, voice (ID de Fish), cover, author, emotion, speed }
      characters: [],
      // Qué voz habla en cada momento. Vacío = voz de respaldo del navegador.
      assign: { chat: '', gift: '', bigGift: '', follow: '', share: '' },
      // Voces especiales por usuario de TikTok: { user, characterId, gifts }
      userVoices: [],
      bigGiftMin: 100,
      model: 's2.1-pro',
      // Si Fish Audio falla, se lee con la voz del navegador para no quedarse callado.
      fallback: true,
    },
    tts: {
      enabled: true,
      readChat: true,
      readGifts: true,
      readFollows: false,
      readShares: false,
      voice: '',
      rate: 1.05,
      pitch: 1,
      volume: 1,
      chatFormat: '{nombre} dice: {mensaje}',
      giftFormat: 'Gracias {nombre} por {cantidad} {regalo}',
      followFormat: '{nombre} te empezó a seguir',
      shareFormat: '{nombre} compartió el live',
      ignorePrefix: '!',
      maxLength: 150,
      maxQueue: 8,
      ignoreLinks: true,
      stripEmojis: true,
      sameUserCooldown: 0,
      blockedWords: '',
      blockedUsers: '',
      onlyUsers: '',
      readUsername: true,
    },
    alerts: {
      minDiamonds: 1,
      duration: 6,
      sound: true,
      volume: 0.6,
      showFollows: true,
      showShares: false,
    },
    ranking: {
      top: 5,
    },
    // Estilo de cada overlay. El panel los cambia y OBS se actualiza solo.
    overlays: {
      // anim: movimiento continuo (idle), efecto al cambiar (change), intensidad,
      // números que suben (counters) y resaltar a quien sube de puesto (rankUp).
      likes: { style: 'lista', title: '', top: 5, bg: true, anim: { on: true, idle: 'ola', change: 'pop', intensity: 'normal', counters: true, rankUp: true } },
      gifts: { style: 'lista', title: '', top: 5, bg: true, anim: { on: true, idle: 'ola', change: 'pop', intensity: 'normal', counters: true, rankUp: true } },
      topGift: { style: 'tarjeta', title: '', bg: true, swap: 4, anim: { on: true, idle: 'brillo', change: 'pop', intensity: 'normal', counters: true } },
    },
  },
};

function deepMerge(base, extra) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v);
    } else if (k in base) {
      out[k] = v;
    }
  }
  return out;
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

let config = deepMerge(DEFAULT_CONFIG, loadJson(CONFIG_FILE, {}));
migrateVoices();

// Versiones anteriores tenían varios servicios de voz; ahora solo Fish Audio.
function migrateVoices() {
  const v = config.settings.voices;
  const before = JSON.stringify(v);
  v.characters = (v.characters || [])
    .filter((c) => c && (c.provider === undefined || c.provider === 'fish') && c.voice)
    .map((c) => ({
      id: String(c.id), name: String(c.name || 'Voz'), voice: String(c.voice),
      cover: c.cover || '', author: c.author || '', emotion: c.emotion || '', speed: Number(c.speed) || 1,
    }));
  const ids = new Set(v.characters.map((c) => c.id));
  for (const k of Object.keys(DEFAULT_CONFIG.settings.voices.assign)) {
    if (!ids.has(v.assign?.[k])) v.assign[k] = '';
  }
  v.userVoices = (v.userVoices || []).filter((r) => r && r.user && ids.has(r.characterId));
  if (JSON.stringify(v) !== before) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); } catch {}
  }
}
const saveConfig = () => fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

// Caracteres usados por servicio de voz, por mes (para cuidar lo que gastas).
const USAGE_FILE = path.join(DATA_DIR, 'uso-voz.json');
const usage = loadJson(USAGE_FILE, {});
const monthKey = () => new Date().toISOString().slice(0, 7);
let usageTimer = null;
function addUsage(provider, chars) {
  const m = (usage[monthKey()] ||= {});
  m[provider] = (m[provider] || 0) + chars;
  clearTimeout(usageTimer);
  usageTimer = setTimeout(() => {
    fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2), () => {});
    io.emit('voiceUsage', usage[monthKey()] || {});
  }, 1000);
}

// ---------------------------------------------------------------------------
// Estado de la sesión: rankings, estadísticas, historial
// ---------------------------------------------------------------------------
const saved = loadJson(RANKING_FILE, {});
const likesByUser = new Map(saved.likes || []);
const giftsByUser = new Map(saved.gifts || []);
const stats = {
  viewers: 0,
  totalLikes: saved.totalLikes || 0,
  diamonds: saved.diamonds || 0,
  follows: saved.follows || 0,
};
const chatHistory = [];
let rankingDirty = false;

// Regalos más caros del stream actual (por precio de cada regalo; empate = mayor cantidad).
let topGifts = Array.isArray(saved.topGifts) ? saved.topGifts : [];
let streamRoomId = saved.streamRoomId || '';
const giftRank = (a, b) => (b.diamonds - a.diamonds) || (b.count - a.count) || (a.ts - b.ts);

function trackTopGift(p) {
  if (!p.diamonds) return;
  const entry = { user: p.user, name: p.name, avatar: p.avatar, gift: p.gift, giftId: p.giftId, image: p.image, diamonds: p.diamonds, count: p.count, total: p.total, ts: Date.now(), test: !!p.test };
  const prevTop = topGifts[0];
  topGifts.push(entry);
  topGifts.sort(giftRank);
  topGifts = topGifts.slice(0, 10);
  rankingDirty = true;
  const isRecord = topGifts[0] === entry && (!prevTop || giftRank(entry, prevTop) < 0);
  io.emit('topGifts', { list: topGifts, record: isRecord ? entry : null });
}

function resetTopGifts() {
  topGifts = [];
  rankingDirty = true;
  io.emit('topGifts', { list: topGifts, record: null });
}

function saveRanking(sync = false) {
  if (!rankingDirty) return;
  rankingDirty = false;
  const data = JSON.stringify({
    likes: [...likesByUser],
    gifts: [...giftsByUser],
    totalLikes: stats.totalLikes,
    diamonds: stats.diamonds,
    follows: stats.follows,
    topGifts,
    streamRoomId,
  });
  if (sync) fs.writeFileSync(RANKING_FILE, data);
  else fs.writeFile(RANKING_FILE, data, () => {});
}
setInterval(saveRanking, 15000);

function topOf(map, n = 10) {
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, n);
}

function rankings() {
  return { likes: topOf(likesByUser), gifts: topOf(giftsByUser), stats };
}

let rankingTimer = null;
function broadcastRankings() {
  // Los likes llegan en ráfagas; mandamos el ranking como máximo 2 veces por segundo.
  if (rankingTimer) return;
  rankingTimer = setTimeout(() => {
    rankingTimer = null;
    io.emit('rankings', rankings());
  }, 500);
}

// ---------------------------------------------------------------------------
// Normalización de datos de TikTok
// ---------------------------------------------------------------------------
const firstUrl = (img) => img?.urlList?.[0] || img?.url_list?.[0] || '';

function normUser(u = {}) {
  const id = u.uniqueId || u.displayId || u.id || 'anonimo';
  return {
    user: String(id),
    name: u.nickname || String(id),
    avatar: firstUrl(u.avatarThumb) || firstUrl(u.avatarMedium) || u.profilePictureUrl || '',
  };
}

function addToMap(map, who, amount) {
  const entry = map.get(who.user) || { ...who, value: 0 };
  entry.name = who.name;
  if (who.avatar) entry.avatar = who.avatar;
  entry.value += amount;
  map.set(who.user, entry);
  rankingDirty = true;
}

// --- Handlers que usan tanto TikTok real como el modo de prueba -------------
function handleGift(d, isTest = false) {
  const who = normUser(d.user);
  const g = d.gift || {};
  const ext = d.extendedGiftInfo || {};
  const name = g.name || ext.name || d.giftName || `Regalo ${d.giftId}`;
  const diamonds = Number(g.diamondCount || ext.diamond_count || d.diamondCount || 0);
  const image =
    firstUrl(g.image) || firstUrl(g.icon) || firstUrl(ext.image) || firstUrl(ext.icon) || d.giftPictureUrl || '';
  const type = g.type ?? ext.type ?? d.giftType;
  const count = Number(d.repeatCount || d.comboCount || 1);
  const payload = { ...who, gift: name, giftId: String(d.giftId || ''), image, diamonds, count, test: isTest };

  // Regalos tipo "racha" (type 1): TikTok manda un evento por cada toque.
  // Mostramos el contador en vivo, pero la alerta y el conteo final van al terminar la racha.
  if (type === 1 && !d.repeatEnd) {
    io.emit('giftStreak', payload);
    return;
  }

  payload.total = diamonds * count;
  stats.diamonds += payload.total;
  addToMap(giftsByUser, who, payload.total);
  io.emit('gift', payload);
  trackTopGift(payload);
  broadcastRankings();
}

function handleLike(d) {
  const who = normUser(d.user);
  const count = Number(d.count ?? d.likeCount ?? 1);
  addToMap(likesByUser, who, count);
  const total = Number(d.total ?? d.totalLikeCount ?? 0);
  stats.totalLikes = total > stats.totalLikes ? total : stats.totalLikes + count;
  broadcastRankings();
}

function handleChat(d, isTest = false) {
  const who = normUser(d.user);
  const text = String(d.content ?? d.comment ?? '').trim();
  if (!text) return;
  const msg = { ...who, text, ts: Date.now(), test: isTest };
  chatHistory.push(msg);
  if (chatHistory.length > 50) chatHistory.shift();
  io.emit('chat', msg);
}

function handleFollow(d) {
  stats.follows += 1;
  rankingDirty = true;
  io.emit('follow', normUser(d.user));
  broadcastRankings();
}

function handleShare(d) {
  io.emit('share', normUser(d.user));
}

// ---------------------------------------------------------------------------
// Conexión con TikTok LIVE
// ---------------------------------------------------------------------------
let conn = null;
let wantConnected = false;
let retryTimer = null;
let status = { state: 'idle', message: 'Sin conectar' };

function setStatus(state, message, extra = {}) {
  status = { state, message, ...extra };
  io.emit('status', status);
  console.log(`[estado] ${message}`);
}

function scheduleRetry(seconds) {
  clearTimeout(retryTimer);
  if (!wantConnected) return;
  retryTimer = setTimeout(() => connectLive(), seconds * 1000);
}

async function connectLive() {
  clearTimeout(retryTimer);
  const username = config.username.replace(/^@/, '').trim();
  if (!username) return setStatus('error', 'Escribe tu usuario de TikTok');

  if (conn) {
    try { conn.removeAllListeners(); await conn.disconnect(); } catch {}
    conn = null;
  }

  // enableExtendedGiftInfo queda apagado: descargar la lista de regalos requiere el plan
  // de pago de Euler Stream, y cada evento de regalo ya trae nombre, imagen y diamantes.
  const options = { enableExtendedGiftInfo: false, processInitialData: false };
  if (config.signApiKey) options.signApiKey = config.signApiKey.trim();

  const c = new TikTokLiveConnection(username, options);
  conn = c;

  c.on(WebcastEvent.GIFT, (d) => handleGift(d));
  c.on(WebcastEvent.LIKE, (d) => handleLike(d));
  c.on(WebcastEvent.CHAT, (d) => handleChat(d));
  c.on(WebcastEvent.FOLLOW, (d) => handleFollow(d));
  c.on(WebcastEvent.SHARE, (d) => handleShare(d));
  c.on(WebcastEvent.ROOM_USER, (d) => {
    stats.viewers = Number(d.total ?? d.viewerCount ?? 0);
    broadcastRankings();
  });
  c.on(WebcastEvent.STREAM_END, () => {
    setStatus('waiting', 'El live terminó. Esperando a que vuelvas a transmitir…');
    scheduleRetry(30);
  });
  c.on(ControlEvent.DISCONNECTED, () => {
    if (conn !== c || !wantConnected) return;
    if (status.state === 'connected') setStatus('reconnecting', 'Se perdió la conexión. Reintentando…');
    scheduleRetry(10);
  });
  c.on(ControlEvent.ERROR, (err) => console.warn('[tiktok]', err?.info || err?.message || err));

  setStatus('connecting', `Conectando con @${username}…`);
  try {
    const state = await c.connect();
    if (conn !== c) return;
    setStatus('connected', `Conectado al live de @${username}`, { roomId: state?.roomId });
    // Un live nuevo (otra sala) empieza con el récord de regalos en cero.
    const roomId = String(state?.roomId || c.roomId || '');
    if (roomId && roomId !== streamRoomId) {
      streamRoomId = roomId;
      resetTopGifts();
    }
  } catch (err) {
    if (conn !== c) return;
    const msg = err?.message || String(err);
    if (err instanceof UserOfflineError || /offline|not live|isn't online|not online/i.test(msg)) {
      setStatus('waiting', `@${username} no está en vivo. Reintento cada 30 s…`);
      scheduleRetry(30);
    } else if (/room ?id/i.test(msg)) {
      setStatus('waiting', `No encontré un live activo de @${username}. Revisa que el usuario esté bien escrito y que estés en vivo. Reintento en 30 s…`);
      scheduleRetry(30);
    } else if (/business plan|requires a .*plan|premium/i.test(msg)) {
      wantConnected = false;
      setStatus('error', `Esta función requiere un plan de pago de Euler Stream y la app no debería usarla. Actualiza la app. Detalle: ${msg}`);
    } else if (/rate.?limit/i.test(msg)) {
      setStatus('error', 'Límite de conexiones del servicio gratuito. Reintento en 60 s (una API key de Euler Stream lo evita).');
      scheduleRetry(60);
    } else {
      setStatus('error', `No se pudo conectar: ${msg}. Reintento en 20 s…`);
      scheduleRetry(20);
    }
  }
}

async function disconnectLive() {
  wantConnected = false;
  clearTimeout(retryTimer);
  if (conn) {
    try { conn.removeAllListeners(); await conn.disconnect(); } catch {}
    conn = null;
  }
  setStatus('idle', 'Desconectado');
}

// ---------------------------------------------------------------------------
// Servidor web + sockets
// ---------------------------------------------------------------------------
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '64kb' }));

// Genera el audio de una voz. El panel manda la voz y el texto; la key se queda aquí.
app.post('/api/tts', async (req, res) => {
  try {
    const { character, text } = req.body || {};
    const c = character || {};
    const out = await synthesize(
      { voice: c.voice, emotion: c.emotion, speed: c.speed, model: config.settings.voices.model },
      text,
      config.voiceKeys.fish,
      addUsage
    );
    res.set('Content-Type', out.mime);
    res.set('X-Cache', out.cached ? 'HIT' : 'MISS');
    res.send(out.buffer);
  } catch (err) {
    sendError(res, err);
  }
});

// Explorador de voces de Fish Audio.
app.get('/api/voices', async (req, res) => {
  try {
    const out = await listVoices(config.voiceKeys.fish, {
      q: req.query.q,
      page: req.query.page,
      sort: req.query.sort,
      lang: req.query.lang ?? 'es',
      mine: req.query.mine === '1',
    });
    res.json(out);
  } catch (err) {
    sendError(res, err);
  }
});

function sendError(res, err) {
  const status = err instanceof VoiceError ? err.status : 500;
  if (!(err instanceof VoiceError)) console.error('[voz]', err);
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: err.message || String(err) });
}

const server = http.createServer(app);
const io = new Server(server);

const TEST_NAMES = ['Lupita', 'ElPana_77', 'Sofi.gg', 'DonCarlos', 'MaríaJosé', 'Kevin_mx', 'Valeria✨'];
const TEST_GIFTS = [
  { name: 'Rosa', diamonds: 1 },
  { name: 'TikTok', diamonds: 1 },
  { name: 'Corazón', diamonds: 10 },
  { name: 'Dona', diamonds: 30 },
  { name: 'Perfume', diamonds: 20 },
  { name: 'León', diamonds: 29999 },
  { name: 'Universo', diamonds: 44999 },
];
const TEST_COMMENTS = [
  '¡Saludos desde Guadalajara!',
  'jajaja qué buena jugada',
  '¿Qué sensibilidad usas?',
  'Primera vez en tu live, me encanta',
  '!comando que no se debe leer',
  'mira esto https://ejemplo.com',
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fakeUser = (name = pick(TEST_NAMES)) => ({
  displayId: name.toLowerCase().replace(/[^a-z0-9_.]/g, ''),
  nickname: name,
});

io.on('connection', (socket) => {
  socket.emit('config', publicConfig());
  socket.emit('status', status);
  socket.emit('rankings', rankings());
  socket.emit('chatHistory', chatHistory.slice(-20));
  socket.emit('topGifts', { list: topGifts, record: null });

  socket.on('connectLive', ({ username, signApiKey } = {}) => {
    if (typeof username === 'string') config.username = username.replace(/^@/, '').trim();
    if (typeof signApiKey === 'string') config.signApiKey = signApiKey.trim();
    config.autoConnect = true;
    saveConfig();
    io.emit('config', publicConfig());
    wantConnected = true;
    connectLive();
  });

  socket.on('disconnectLive', () => {
    config.autoConnect = false;
    saveConfig();
    disconnectLive();
  });

  socket.on('saveVoiceKey', ({ provider, key } = {}) => {
    if (!(provider in config.voiceKeys)) return;
    config.voiceKeys[provider] = String(key || '').trim();
    saveConfig();
    io.emit('config', publicConfig());
  });

  socket.on('saveSettings', (settings) => {
    config.settings = deepMerge(DEFAULT_CONFIG.settings, settings);
    saveConfig();
    io.emit('config', publicConfig());
  });

  socket.on('resetTopGifts', () => resetTopGifts());

  socket.on('resetRanking', () => {
    likesByUser.clear();
    giftsByUser.clear();
    stats.totalLikes = 0;
    stats.diamonds = 0;
    stats.follows = 0;
    rankingDirty = true;
    saveRanking();
    io.emit('rankings', rankings());
  });

  // --- Modo de prueba (para revisar overlays sin estar en vivo) ---
  socket.on('test:gift', () => {
    const g = pick(TEST_GIFTS);
    handleGift(
      { user: fakeUser(), giftName: g.name, diamondCount: g.diamonds, repeatCount: 1 + Math.floor(Math.random() * 5), repeatEnd: 1 },
      true
    );
  });
  socket.on('test:chat', () => handleChat({ user: fakeUser(), content: pick(TEST_COMMENTS) }, true));
  socket.on('test:likes', () => {
    for (let i = 0; i < 6; i++) handleLike({ user: fakeUser(), count: 1 + Math.floor(Math.random() * 40) });
  });
  socket.on('test:follow', () => handleFollow({ user: fakeUser() }));

  // Solo para desarrollo: inyecta eventos con la forma exacta de TikTok.
  if (process.env.KIT_DEBUG) {
    socket.on('debug:raw', ({ type, data }) => {
      ({ gift: handleGift, like: handleLike, chat: handleChat, follow: handleFollow })[type]?.(data);
    });
  }
});

function publicConfig() {
  return {
    username: config.username,
    hasSignApiKey: Boolean(config.signApiKey),
    fishKey: config.voiceKeys.fish ? '••••' + config.voiceKeys.fish.slice(-4) : '',
    fishModels: FISH_MODELS,
    voiceUsage: usage[monthKey()] || {},
    settings: config.settings,
    port: PORT,
  };
}

// Lo usa la app de escritorio para saber si estás en vivo antes de cerrar.
export const getStatus = () => status;

// Guarda todo de inmediato (al cerrar la app o antes de actualizar).
export function flush() {
  rankingDirty = true;
  saveRanking(true);
  try { fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2)); } catch {}
}

export const ready = new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, HOST, () => {
    server.off('error', reject);
    const url = `http://${HOST}:${PORT}`;
    console.log(`StreamV2 listo en ${url} (datos en ${DATA_DIR})`);
    if (!DESKTOP && !process.env.NO_OPEN) openBrowser(url);
    if (config.autoConnect && config.username) {
      wantConnected = true;
      connectLive();
    }
    resolve({ url, port: PORT });
  });
});

if (!DESKTOP) {
  ready.catch((err) => {
    console.error(err.code === 'EADDRINUSE' ? `El puerto ${PORT} ya está en uso. ¿Ya tienes StreamV2 abierto?` : err);
    process.exit(1);
  });
  const shutdown = () => { flush(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}
