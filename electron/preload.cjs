// Puente seguro entre el panel y la app de escritorio.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('streamv2', {
  desktop: true,
  info: () => ipcRenderer.invoke('app:info'),
  openDataDir: () => ipcRenderer.invoke('app:openDataDir'),
  importOld: () => ipcRenderer.invoke('app:importOld'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdate: (cb) => {
    const fn = (_e, state) => cb(state);
    ipcRenderer.on('update:state', fn);
    return () => ipcRenderer.removeListener('update:state', fn);
  },
});
