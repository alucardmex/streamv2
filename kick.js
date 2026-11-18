// StreamV2 — conexión con el chat de Kick.
// Kick publica los eventos del chat por Pusher (el mismo websocket que usa kick.com), sin iniciar sesión.
// Para saber el número de chat del canal se lee la info pública del canal en kick.com.
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';

const PUSHER_URL = process.env.KICK_WS_URL || 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false';
const API_BASE = process.env.KICK_API_BASE || 'https://kick.com';
const isElectron = Boolean(process.versions.electron);

// kick.com está detrás de Cloudflare, que rechaza a Node. Dentro de la app se usa la red de Chromium
// (la misma del navegador) y, si Cloudflare pide verificación, una ventana oculta que la resuelve.
async function fetchJson(url) {
  if (isElectron && !process.env.KICK_API_BASE) {
    const { net } = await import('electron');
    try {
      const r = await net.fetch(url, { headers: { Accept: 'application/json' } });
      if (r.ok) return await r.json();
    } catch {}
    return hiddenWindowJson(url);
  }
  const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  if (r.status === 404) throw Object.assign(new Error('not found'), { code: 404 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function hiddenWindowJson(url) {
  const { BrowserWindow } = await import('electron');
  const win = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { javascript: true } });
  try {
    await win.loadURL(url).catch(() => {});
    for (let i = 0; i < 40; i++) {
      const text = await win.webContents.executeJavaScript('document.body ? document.body.innerText : ""').catch(() => '');
      const t = String(text).trim();
      if (t.startsWith('{')) return JSON.parse(t);
      if (/not found|404/i.test(t) && t.length < 200) throw Object.assign(new Error('not found'), { code: 404 });
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('Kick no respondió (Cloudflare)');
  } finally {
    win.destroy();
  }
}

export async function kickChannelInfo(slug) {
  const d = await fetchJson(`${API_BASE}/api/v2/channels/${encodeURIComponent(slug)}`);
  if (!d || !d.chatroom?.id) throw Object.assign(new Error('not found'), { code: 404 });
  return {
    channelId: d.id,
    chatroomId: d.chatroom.id,
    username: d.user?.username || slug,
    avatar: d.user?.profile_pic || '',
    live: d.livestream ? { id: String(d.livestream.id), viewers: Number(d.livestream.viewer_count) || 0 } : null,
  };
}

const parse = (s) => {
  let v = s;
  for (let i = 0; i < 2 && typeof v === 'string'; i++) { try { v = JSON.parse(v); } catch { break; } }
  return v;
};
const userOf = (name, slug, extra = {}) => ({ uniqueId: String(slug || name || 'anonimo').toLowerCase(), nickname: String(name || slug || 'Anónimo'), ...extra });

export class KickConnection extends EventEmitter {
  constructor(slug) {
    super();
    this.slug = String(slug).toLowerCase();
    this.ws = null;
    this.closed = false;
    this.info = null;
    this.pingTimer = null;
    this.viewersTimer = null;
  }

  async connect() {
    this.info = await kickChannelInfo(this.slug);
    await this.openSocket();
    // Espectadores: se revisan cada minuto (si kick.com responde).
    this.viewersTimer = setInterval(() => this.refreshInfo(), 60000);
    return this.info;
  }

  async refreshInfo() {
    try {
      const info = await kickChannelInfo(this.slug);
      const wasLive = this.info?.live?.id;
      this.info = info;
      if (info.live) this.emit('viewers', info.live.viewers);
      if (info.live && info.live.id !== wasLive) this.emit('live', info.live.id);
    } catch {}
  }

  openSocket() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(PUSHER_URL);
      this.ws = ws;
      let ok = false;
      const fail = setTimeout(() => { if (!ok) { ws.terminate(); reject(new Error('No se pudo abrir el chat de Kick')); } }, 15000);
      ws.on('message', (raw) => {
        const msg = parse(raw.toString());
        if (!msg || typeof msg !== 'object') return;
        if (msg.event === 'pusher:connection_established') {
          const { chatroomId: r, channelId: c } = this.info;
          for (const ch of [`chatrooms.${r}.v2`, `chatroom_${r}`, `chatrooms.${r}`, `channel.${c}`, `channel_${c}`]) {
            ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: ch } }));
          }
          ok = true;
          clearTimeout(fail);
          resolve();
          return;
        }
        if (msg.event === 'pusher:ping') return ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
        if (msg.event?.startsWith('pusher')) return;
        try { this.handle(msg.event, parse(msg.data) || {}); } catch (err) { this.emit('warn', err); }
      });
      ws.on('error', (err) => { if (!ok) { clearTimeout(fail); reject(err); } else this.emit('warn', err); });
      ws.on('close', () => {
        clearInterval(this.pingTimer);
        if (!this.closed && ok) this.emit('disconnected');
      });
      // Pusher corta si no hay actividad: un ping cada 60 s.
      this.pingTimer = setInterval(() => { try { ws.send(JSON.stringify({ event: 'pusher:ping', data: {} })); } catch {} }, 60000);
    });
  }

  handle(event, d) {
    const ev = String(event || '').replace(/^App\\Events\\/, '');
    if (ev === 'ChatMessageEvent') {
      const s = d.sender || {};
      const badges = (s.identity?.badges || []).map((b) => b.type);
      const text = String(d.content || '').replace(/\[emote:\d+:([^\]]+)\]/g, '$1').trim();
      if (!text) return;
      this.emit('chat', {
        user: userOf(s.username, s.slug),
        content: text,
        isModerator: badges.includes('moderator') || badges.includes('broadcaster'),
        badges,
      });
    } else if (ev === 'SubscriptionEvent') {
      this.emit('sub', { user: userOf(d.username), months: Number(d.months) || 1 });
    } else if (ev === 'GiftedSubscriptionsEvent') {
      const list = Array.isArray(d.gifted_usernames) ? d.gifted_usernames : [];
      this.emit('giftsub', { user: userOf(d.gifter_username), count: list.length || 1, recipients: list.slice(0, 20) });
    } else if (ev === 'FollowersUpdated') {
      if (d.followed && d.username) this.emit('follow', { user: userOf(d.username) });
    } else if (/kicks?gift/i.test(ev)) {
      // Kicks (la moneda para regalar de Kick).
      const s = d.sender || d.user || {};
      const g = d.gift || {};
      const amount = Number(g.amount ?? d.amount ?? d.kicks ?? 0);
      if (!amount) return;
      this.emit('kicks', {
        user: userOf(s.username || d.username || d.gifter_username, s.slug),
        name: String(g.name || g.gift_id || 'Kicks'),
        giftId: String(g.gift_id || ''),
        amount,
        message: String(d.message || ''),
      });
    } else if (ev === 'StreamerIsLive') {
      const id = d.livestream?.id ?? d.livestream_id ?? d.id;
      if (id) this.emit('live', String(id));
    } else if (ev === 'StopStreamBroadcast') {
      this.emit('streamEnd');
    }
  }

  disconnect() {
    this.closed = true;
    clearInterval(this.pingTimer);
    clearInterval(this.viewersTimer);
    try { this.ws?.close(); } catch {}
    this.removeAllListeners();
  }
}
