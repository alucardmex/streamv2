// StreamV2 — app de escritorio
// Arranca el servidor local (para que OBS siga usando http://127.0.0.1:3939),
// muestra el panel en su propia ventana y se actualiza sola desde GitHub.

import { app, BrowserWindow, shell, ipcMain, dialog, Menu, globalShortcut } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import updaterPkg from 'electron-updater';

const { autoUpdater } = updaterPkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ICON = path.join(ROOT, 'build', 'icon.png');
const DATA_FILES = ['config.json', 'ranking.json', 'uso-voz.json'];

let win = null;
let server = null;
let baseUrl = '';
let quitting = false;
let updateState = { state: 'idle' };
let firstRun = false;

// ---------------------------------------------------------------------------
// Una sola StreamV2 abierta a la vez (dos se pelearían por el puerto 3939).
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
  app.whenReady().then(start);
}

app.setAppUserModelId('com.streamv2.app');

async function start() {
  Menu.setApplicationMenu(null);

  // Los datos (ajustes, ranking, uso de voz) viven fuera de la instalación.
  process.env.STREAMV2_DESKTOP = '1';
  process.env.STREAMV2_DATA_DIR = app.getPath('userData');
  firstRun = !DATA_FILES.some((f) => fs.existsSync(path.join(app.getPath('userData'), f)));

  try {
    server = await import('../server.js');
    ({ url: baseUrl } = await server.ready);
  } catch (err) {
    const busy = err?.code === 'EADDRINUSE';
    dialog.showErrorBox(
      'StreamV2 no pudo iniciar',
      busy
        ? 'El puerto 3939 ya está en uso.\n\nSeguramente tienes abierta la versión anterior de StreamV2 (la ventana negra). Ciérrala y vuelve a abrir StreamV2.'
        : `Ocurrió un error al iniciar:\n\n${err?.stack || err}`
    );
    app.exit(1);
    return;
  }

  createWindow();
  setupUpdater();
  setupShortcuts();
}

// Atajos que funcionan aunque estés en el juego (marcador de partidas y contador de tiempo).
function setupShortcuts() {
  const keys = {
    'CommandOrControl+Alt+G': () => server.matchesAction?.('win'),
    'CommandOrControl+Alt+P': () => server.matchesAction?.('loss'),
    'CommandOrControl+Alt+Z': () => server.matchesAction?.('undo'),
    'CommandOrControl+Alt+T': () => server.timerAction?.('toggle'),
  };
  for (const [k, fn] of Object.entries(keys)) {
    try { if (!globalShortcut.register(k, fn)) console.warn('[atajos] ocupado:', k); } catch (e) { console.warn('[atajos]', k, e.message); }
  }
}
app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch {} });

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    title: 'StreamV2',
    icon: ICON,
    backgroundColor: '#15111f',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      // El bot de voz habla sin tener que hacer clic primero.
      autoplayPolicy: 'no-user-gesture-required',
      // Que no se pause la voz ni las alertas cuando la ventana está minimizada.
      backgroundThrottling: false,
    },
  });

  win.loadURL(baseUrl);
  win.once('ready-to-show', () => win.show());

  // Links externos (Fish Audio, nodejs, etc.) y overlays: en el navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(baseUrl)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // F5 recarga, F12 abre herramientas de diagnóstico.
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5') win.webContents.reload();
    if (input.key === 'F12') win.webContents.toggleDevTools();
  });

  win.on('close', (e) => {
    if (quitting) return;
    if (server?.getStatus?.().state === 'connected') {
      const choice = dialog.showMessageBoxSync(win, {
        type: 'question',
        buttons: ['Cerrar StreamV2', 'Cancelar'],
        defaultId: 1,
        cancelId: 1,
        title: 'Estás en vivo',
        message: '¿Cerrar StreamV2?',
        detail: 'Estás conectado a tu live. Si cierras la app se detienen las alertas, el ranking y el bot de voz.',
      });
      if (choice === 1) { e.preventDefault(); return; }
    }
    quitting = true;
  });
  win.on('closed', () => { win = null; app.quit(); });
}

app.on('before-quit', () => {
  quitting = true;
  try { server?.flush?.(); } catch {}
});
app.on('window-all-closed', () => app.quit());

// ---------------------------------------------------------------------------
// Puente con el panel
// ---------------------------------------------------------------------------
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  dataDir: app.getPath('userData'),
  packaged: app.isPackaged,
  update: updateState,
  firstRun,
}));

ipcMain.handle('app:openDataDir', () => shell.openPath(app.getPath('userData')));

// Copia los ajustes de la versión anterior (la carpeta con INICIAR.bat) y reinicia.
ipcMain.handle('app:importOld', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige la carpeta de tu StreamV2 anterior (donde estaba INICIAR.bat)',
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  const from = res.filePaths[0];
  const found = DATA_FILES.filter((f) => fs.existsSync(path.join(from, f)));
  if (!found.length) {
    return { ok: false, error: 'En esa carpeta no hay ajustes de StreamV2 (config.json, ranking.json o uso-voz.json).' };
  }
  const answer = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Importar y reiniciar', 'Cancelar'],
    defaultId: 0,
    cancelId: 1,
    message: 'Importar ajustes de la versión anterior',
    detail: `Se copiarán: ${found.join(', ')}.\nReemplazan los ajustes actuales de la app. StreamV2 se reiniciará.`,
  });
  if (answer.response !== 0) return { ok: false, canceled: true };
  const to = app.getPath('userData');
  for (const f of found) fs.copyFileSync(path.join(from, f), path.join(to, f));
  quitting = true;
  app.relaunch();
  app.exit(0);
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Actualizaciones automáticas (GitHub Releases, descarga solo lo que cambió)
// ---------------------------------------------------------------------------
function sendUpdate(state) {
  updateState = state;
  win?.webContents.send('update:state', state);
}

function setupUpdater() {
  const enabled = app.isPackaged || process.env.STREAMV2_FORCE_UPDATER;
  if (!enabled) { sendUpdate({ state: 'dev' }); return; }
  if (process.env.STREAMV2_FORCE_UPDATER) autoUpdater.forceDevUpdateConfig = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // si no reinicias, se instala al cerrar la app
  autoUpdater.logger = { info() {}, warn: console.warn, error: console.error, debug() {} };

  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none', checkedAt: Date.now() }));
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => sendUpdate({ state: 'downloading', version: updateState.version, percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => sendUpdate({ state: 'ready', version: i.version, notes: plainNotes(i.releaseNotes) }));
  autoUpdater.on('error', (err) => sendUpdate({ state: 'error', message: friendlyError(err) }));

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 4000);
  setInterval(check, 2 * 60 * 60 * 1000);
}

ipcMain.handle('update:check', () => {
  if (!(app.isPackaged || process.env.STREAMV2_FORCE_UPDATER)) return { state: 'dev' };
  autoUpdater.checkForUpdates().catch(() => {});
  return { ok: true };
});

ipcMain.handle('update:install', () => {
  if (updateState.state !== 'ready') return false;
  quitting = true;
  try { server?.flush?.(); } catch {}
  // Instala en silencio y vuelve a abrir StreamV2.
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
  return true;
});

function plainNotes(notes) {
  if (!notes) return '';
  const text = Array.isArray(notes) ? notes.map((n) => n.note).join('\n') : String(notes);
  return text.replace(/<[^>]+>/g, '').trim().slice(0, 600);
}

function friendlyError(err) {
  const msg = String(err?.message || err);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::ERR|network/i.test(msg)) return 'Sin conexión para buscar actualizaciones.';
  if (/404/.test(msg)) return 'Todavía no hay versiones publicadas.';
  return msg.split('\n')[0].slice(0, 160);
}
