// StreamV2 — motor de voz con Fish Audio
// Genera el audio en esta computadora; la API key nunca sale de aquí.
// Docs: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech

import crypto from 'node:crypto';

const API = process.env.FISH_API_URL || 'https://api.fish.audio';
const CDN = process.env.FISH_CDN_URL || 'https://public-platform.r2.fish.audio';

export const FISH_MODELS = [
  ['s2.1-pro', 'S2.1 Pro (recomendado)'],
  ['s2-pro', 'S2 Pro'],
  ['s2.1-pro-free', 'S2.1 Pro gratis (para probar)'],
];

export class VoiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// ---------------------------------------------------------------------------
// Caché: las frases repetidas (agradecimientos, pruebas) no se vuelven a cobrar.
// ---------------------------------------------------------------------------
const cache = new Map();
const CACHE_MAX = 250;

export async function synthesize({ voice, emotion, speed, model }, text, apiKey, onUsage) {
  text = String(text || '').trim().slice(0, 600);
  if (!text) throw new VoiceError('No hay texto que leer', 400);
  if (!apiKey) throw new VoiceError('Falta tu API key de Fish Audio', 401);
  if (!voice) throw new VoiceError('Esta voz no tiene ID de Fish Audio', 400);
  speed = clamp(Number(speed) || 1, 0.5, 2);
  emotion = String(emotion || '').replace(/[()]/g, '').trim();
  model = String(model || 's2.1-pro');

  const key = crypto.createHash('sha1').update(JSON.stringify([voice, emotion, speed, model, text])).digest('hex');
  if (cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit, cached: true };
  }

  // Las emociones se escriben dentro del texto, por ejemplo "(excited) ¡Hola!".
  const body = {
    text: (emotion ? `(${emotion}) ` : '') + text,
    reference_id: voice,
    format: 'mp3',
    latency: 'balanced',
    normalize: true,
    language: 'es',
  };
  if (speed !== 1) body.prosody = { speed };

  let res;
  try {
    res = await fetch(`${API}/v1/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, model },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    throw new VoiceError(`No se pudo contactar a Fish Audio: ${err.name === 'TimeoutError' ? 'tardó demasiado' : err.message}`, 502);
  }
  if (!res.ok) throw await readError(res);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new VoiceError('Fish Audio devolvió audio vacío', 502);

  const result = { buffer, mime: 'audio/mpeg' };
  onUsage?.('fish', text.length);
  cache.set(key, result);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return result;
}

async function readError(res) {
  let detail = '';
  try {
    const body = await res.text();
    try {
      const j = JSON.parse(body);
      detail = j.message || j.detail?.message || (typeof j.detail === 'string' ? j.detail : '') || body;
    } catch {
      detail = body;
    }
  } catch {}
  detail = String(detail).slice(0, 200);
  const friendly = {
    401: 'Tu API key de Fish Audio no es válida',
    402: 'Tu cuenta de Fish Audio no tiene saldo',
    403: 'Fish Audio rechazó la petición (revisa tu plan o los permisos de la key)',
    404: 'Fish Audio no encontró esa voz; puede que la hayan borrado',
    429: 'Fish Audio está limitando las peticiones; espera un momento',
    503: 'Fish Audio está saturado en este momento',
  }[res.status];
  return new VoiceError(friendly ? `${friendly}${detail ? ` (${detail})` : ''}` : `Fish Audio respondió ${res.status}: ${detail}`, res.status);
}

// ---------------------------------------------------------------------------
// Biblioteca de voces — https://docs.fish.audio/api-reference/endpoint/model/list-models
// ---------------------------------------------------------------------------
const absolute = (u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${CDN}/${String(u).replace(/^\/+/, '')}`);

function coverUrl(m) {
  // Las portadas viven en el CDN público de Fish Audio: /coverimage/<id>
  const raw = m.cover_image || '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw) return `${CDN}/cdn-cgi/image/width=240,format=webp/${raw.replace(/^\/+/, '')}`;
  return `${CDN}/cdn-cgi/image/width=240,format=webp/coverimage/${m._id}`;
}

export function toVoice(m) {
  const sample = (m.samples || []).find((s) => s.audio) || null;
  return {
    id: m._id,
    name: m.title || 'Sin nombre',
    description: String(m.description || '').slice(0, 200),
    author: m.author?.nickname || '',
    uses: Number(m.task_count) || 0,
    likes: Number(m.like_count) || 0,
    languages: m.languages || [],
    tags: (m.tags || []).slice(0, 4),
    cover: coverUrl(m),
    sample: sample ? absolute(sample.audio) : '',
    sampleText: sample?.text || '',
  };
}

export async function listVoices(apiKey, { q = '', page = 1, sort = 'task_count', lang = 'es', mine = false } = {}) {
  if (!apiKey) throw new VoiceError('Primero guarda tu API key de Fish Audio', 401);
  const params = new URLSearchParams({
    page_size: '24',
    page_number: String(Math.max(1, Number(page) || 1)),
    sort_by: ['score', 'task_count', 'created_at'].includes(sort) ? sort : 'task_count',
  });
  if (mine) params.set('self', 'true');
  else if (lang) params.set('language', lang);
  if (q) params.set('title', String(q).slice(0, 80));

  let res;
  try {
    res = await fetch(`${API}/model?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new VoiceError(`No se pudo contactar a Fish Audio: ${err.message}`, 502);
  }
  if (!res.ok) throw await readError(res);
  const data = await res.json();
  const items = (data.items || []).filter((m) => !m.dmca_taken_down && (m.state ? m.state === 'trained' : true));
  const total = Number(data.total) || 0;
  return {
    voices: items.map(toVoice),
    total,
    hasMore: data.has_more ?? (Number(page) * 24 < total),
  };
}
