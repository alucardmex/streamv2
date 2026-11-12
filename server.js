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
      delay: 0, // segundos de pausa entre un mensaje y el siguiente
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
      // Alertas con tu propio video, foto o GIF para un regalo o desde cierta cantidad de diamantes.
      // Lo que no tenga una propia usa la animación de siempre.
      custom: [],
    },
    // Escenas: varios overlays en un solo link (para tener una sola fuente de navegador).
    scenes: [],
    ranking: {
      top: 5,
    },
    // Estilo de cada overlay. El panel los cambia y OBS se actualiza solo.
    overlays: {
      // anim: movimiento continuo (idle), efecto al cambiar (change), intensidad,
      // números que suben (counters) y resaltar a quien sube de puesto (rankUp).
      likes: { style: 'lista', title: '❤️ Top taps', showTitle: true, top: 5, bg: true, anim: { on: true, idle: 'ola', change: 'pop', intensity: 'normal', counters: true, rankUp: true } },
      gifts: { style: 'lista', title: '💎 Top regalos', showTitle: true, top: 5, bg: true, anim: { on: true, idle: 'ola', change: 'pop', intensity: 'normal', counters: true, rankUp: true } },
      topGift: { style: 'tarjeta', title: 'Regalo más caro del stream', showTitle: true, bg: true, swap: 4, anim: { on: true, idle: 'brillo', change: 'pop', intensity: 'normal', counters: true } },
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

const savedConfig = loadJson(CONFIG_FILE, {});
let config = deepMerge(DEFAULT_CONFIG, savedConfig);
migrateVoices();
migrateTitles();

// Antes el título vacío significaba "el de siempre"; ahora vacío significa sin título.
// A quien venga de una versión anterior con el título vacío se le pone el de siempre.
function migrateTitles() {
  for (const k of ['likes', 'gifts', 'topGift']) {
    const old = savedConfig.settings?.overlays?.[k];
    if (old && old.showTitle === undefined && !String(old.title || '').trim()) {
      config.settings.overlays[k].title = DEFAULT_CONFIG.settings.overlays[k].title;
    }
  }
}

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

// ---------------------------------------------------------------------------
// Alertas personalizadas: archivos que subes (video, foto o GIF)
// ---------------------------------------------------------------------------
const MEDIA_DIR = path.join(DATA_DIR, 'media');
fs.mkdirSync(MEDIA_DIR, { recursive: true });
const MEDIA_EXT = { mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', gif: 'image', png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', apng: 'image' };
const MEDIA_NAME = /^[a-z0-9][a-z0-9-]{0,80}\.(mp4|webm|mov|m4v|gif|png|jpe?g|webp|apng)$/;
const pick1 = (v, list, d) => (list.includes(v) ? v : d);

function cleanCustom(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 60).filter((r) => r && typeof r === 'object').map((r) => ({
    id: String(r.id || Math.random().toString(36).slice(2, 10)).slice(0, 24),
    on: r.on !== false,
    kind: pick1(r.kind, ['gift', 'amount'], 'gift'),
    gift: String(r.gift || '').slice(0, 60),
    giftId: String(r.giftId || '').slice(0, 30),
    giftImage: String(r.giftImage || '').slice(0, 600),
    min: Math.max(1, Math.round(Number(r.min) || 100)),
    media: MEDIA_NAME.test(String(r.media || '')) ? String(r.media) : '',
    mediaType: pick1(r.mediaType, ['video', 'image'], 'image'),
    size: pick1(r.size, ['chico', 'mediano', 'grande', 'completo'], 'mediano'),
    sound: pick1(r.sound, ['video', 'campana', 'ninguno'], 'campana'),
    showText: r.showText !== false,
    secs: Math.max(0, Math.min(60, Number(r.secs) || 0)),
  }));
}
config.settings.alerts.custom = cleanCustom(config.settings.alerts.custom);

const SCENE_ITEM_TYPES = ['alertas', 'topGift', 'likes', 'gifts', 'chat'];
const clampN = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
function cleanScenes(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 12).filter((s) => s && typeof s === 'object').map((s, i) => {
    const w = clampN(s.w, 320, 3840, 1920), h = clampN(s.h, 320, 3840, 1080);
    const seen = new Set();
    const items = (Array.isArray(s.items) ? s.items : []).filter((it) => it && SCENE_ITEM_TYPES.includes(it.type) && !seen.has(it.type) && seen.add(it.type)).map((it) => ({
      id: String(it.id || it.type).slice(0, 24),
      type: it.type,
      on: it.on !== false,
      x: clampN(it.x, -2000, 4000, 0), y: clampN(it.y, -2000, 4000, 0),
      w: clampN(it.w, 60, 3840, 400), h: clampN(it.h, 40, 3840, 300),
      scale: Math.max(0.3, Math.min(3, Number(it.scale) || 1)),
      pos: pick1(it.pos, ['arriba', 'centro', 'abajo'], 'centro'),
    }));
    return { id: String(s.id || `escena${i + 1}`).replace(/[^a-z0-9-]/gi, '').slice(0, 24) || `escena${i + 1}`, name: String(s.name || `Escena ${i + 1}`).slice(0, 40), w, h, items };
  });
}
config.settings.scenes = cleanScenes(config.settings.scenes);

// Al abrir, borra los archivos que ya no usa ninguna alerta.
try {
  const used = new Set(config.settings.alerts.custom.map((r) => r.media));
  for (const f of fs.readdirSync(MEDIA_DIR)) if (MEDIA_NAME.test(f) && !used.has(f)) fs.rmSync(path.join(MEDIA_DIR, f), { force: true });
} catch {}

// Regalos que te han mandado (nombre tal como lo manda TikTok, imagen y precio), para elegirlos en el panel.
const GIFTS_FILE = path.join(DATA_DIR, 'regalos.json');
const giftCatalog = new Map(Object.entries(loadJson(GIFTS_FILE, {})));
let catalogTimer = null;
const catalogList = () => [...giftCatalog.values()].sort((a, b) => (b.diamonds - a.diamonds) || a.name.localeCompare(b.name)).slice(0, 300);
function rememberGift(p) {
  const key = p.giftId || p.gift;
  if (!key) return;
  const prev = giftCatalog.get(key);
  if (prev && prev.name === p.gift && prev.image === (p.image || prev.image) && prev.diamonds === p.diamonds) return;
  giftCatalog.set(key, { id: p.giftId, name: p.gift, image: p.image || prev?.image || '', diamonds: p.diamonds });
  clearTimeout(catalogTimer);
  catalogTimer = setTimeout(() => {
    fs.writeFile(GIFTS_FILE, JSON.stringify(Object.fromEntries(giftCatalog), null, 1), () => {});
    io.emit('giftCatalog', catalogList());
  }, 1500);
}

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
  if (!isTest) rememberGift(payload);

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
app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h' }));

// Sube un archivo para una alerta personalizada. El panel manda el archivo tal cual.
app.post('/api/media', express.raw({ type: () => true, limit: '400mb' }), (req, res) => {
  const orig = String(req.query.name || 'archivo');
  const ext = (orig.split('.').pop() || '').toLowerCase();
  const kind = MEDIA_EXT[ext];
  if (!kind) return res.status(400).json({ error: 'Formato no compatible. Usa MP4, WEBM, GIF, PNG, JPG o WEBP.' });
  if (!req.body?.length) return res.status(400).json({ error: 'El archivo llegó vacío.' });
  const slug = orig.slice(0, -(ext.length + 1)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'alerta';
  const file = `${Date.now().toString(36)}-${slug}.${ext === 'jpeg' ? 'jpg' : ext}`;
  try {
    fs.writeFileSync(path.join(MEDIA_DIR, file), req.body);
    res.json({ file, kind });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo guardar el archivo: ' + e.message });
  }
});

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
    config.settings.alerts.custom = cleanCustom(config.settings.alerts.custom);
    config.settings.scenes = cleanScenes(config.settings.scenes);
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
    // Si ya te han mandado regalos, la prueba usa uno de esos (nombre e imagen reales).
    const known = catalogList().filter((x) => x.diamonds > 0);
    const real = known.length ? pick(known) : null;
    const g = real || pick(TEST_GIFTS);
    handleGift(
      { user: fakeUser(), giftName: g.name, giftId: real?.id || '', giftPictureUrl: real?.image || '', diamondCount: g.diamonds, repeatCount: 1 + Math.floor(Math.random() * 5), repeatEnd: 1 },
      true
    );
  });
  socket.on('test:chat', () => handleChat({ user: fakeUser(), content: pick(TEST_COMMENTS) }, true));
  socket.on('test:likes', () => {
    for (let i = 0; i < 6; i++) handleLike({ user: fakeUser(), count: 1 + Math.floor(Math.random() * 40) });
  });
  socket.on('test:follow', () => handleFollow({ user: fakeUser() }));

  // Probador de alertas del panel: sale en OBS y el bot la lee, pero no cuenta para rankings ni récords.
  socket.on('test:alert', (t = {}) => {
    const name = String(t.name || 'Prueba').slice(0, 40);
    const who = { user: name.toLowerCase().replace(/[^a-z0-9._]/g, '') || 'prueba', name, avatar: '' };
    if (t.type === 'follow') return io.emit('follow', { ...who, test: true });
    if (t.type === 'share') return io.emit('share', { ...who, test: true });
    const diamonds = Math.max(0, Math.min(1e6, Math.round(Number(t.diamonds) || 0)));
    const count = Math.max(1, Math.min(9999, Math.round(Number(t.count) || 1)));
    io.emit('gift', {
      ...who, gift: String(t.gift || 'Regalo').slice(0, 60), giftId: String(t.giftId || '').slice(0, 30),
      image: String(t.image || '').slice(0, 600), diamonds, count, total: diamonds * count, test: true,
    });
  });

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
    giftCatalog: catalogList(),
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
